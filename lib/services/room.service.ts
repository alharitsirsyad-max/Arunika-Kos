import { roomRepo } from "@/lib/repositories/room.repo";
import { bookingRepo } from "@/lib/repositories/booking.repo";
import { NotFoundError, ConflictError, ValidationError, AppError } from "@/lib/errors/AppError";
import { cloudinary } from "@/lib/cloudinary";
import type { CreateRoomInput, UpdateRoomInput } from "@/lib/types/room.types";
import { prisma } from "@/lib/prisma";
import type { UnitStatus } from "@prisma/client";

/** Allowed MIME types for room images. Requirements: 12.1 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

/** Maximum file size: 5 MB. Requirements: 12.3 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const roomService = {
  /**
   * Return all rooms with their units and images.
   * Requirements: 17.1
   */
  async getRooms() {
    return roomRepo.findAll();
  },

  /**
   * Return a single room by ID, including units and images.
   * Throws NotFoundError if no room exists with the given ID.
   * Requirements: 17.1
   */
  async getRoomById(id: string) {
    const room = await roomRepo.findById(id);
    if (!room) {
      throw new NotFoundError(`Kamar dengan ID ${id} tidak ditemukan`);
    }
    return room;
  },

  /**
   * Create a new room.
   * Requirements: 17.1
   */
  async createRoom(data: CreateRoomInput) {
    return roomRepo.create(data);
  },

  /**
   * Update an existing room by ID.
   * Throws NotFoundError if the room does not exist.
   * Requirements: 17.1
   */
  async updateRoom(id: string, data: UpdateRoomInput) {
    // Confirm room exists before attempting update
    const existing = await roomRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Kamar dengan ID ${id} tidak ditemukan`);
    }
    return roomRepo.update(id, data);
  },

  /**
   * Delete a room by ID.
   * Throws NotFoundError if the room does not exist.
   * Throws ConflictError if the room has active bookings (PENDING/APPROVED/ACTIVE).
   * Requirements: 17.1
   */
  async deleteRoom(id: string) {
    // Confirm room exists before attempting delete
    const existing = await roomRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Kamar dengan ID ${id} tidak ditemukan`);
    }

    // Guard: cannot delete a room with active bookings
    const activeCount = await bookingRepo.countActiveByRoomId(id);
    if (activeCount > 0) {
      throw new ConflictError(
        `Tidak dapat menghapus kamar karena masih memiliki ${activeCount} booking aktif (PENDING/APPROVED/ACTIVE)`
      );
    }

    return roomRepo.delete(id);
  },

  /**
   * Validate, upload a room image to Cloudinary, then persist the URL.
   *
   * Validation (Requirements 12.1–12.4):
   *   - MIME type must be image/jpeg or image/png → ValidationError (HTTP 400) if not
   *   - File size must not exceed 5 MB         → ValidationError (HTTP 400) if exceeded
   *
   * Upload (Requirements 12.5–12.7):
   *   - Uploaded directly to Cloudinary from the server (no filesystem)
   *   - Returns { image_url } on success
   *   - Throws AppError with code UPLOAD_FAILED (HTTP 500) if Cloudinary fails
   *
   * Requirements: 12.1–12.7
   */
  async uploadRoomImage(roomId: string, file: File): Promise<{ image_url: string }> {
    // Verify room exists
    const existing = await roomRepo.findById(roomId);
    if (!existing) {
      throw new NotFoundError(`Kamar dengan ID ${roomId} tidak ditemukan`);
    }

    // Req 12.1 / 12.2 — validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new ValidationError(
        "Format file tidak didukung. Hanya JPEG dan PNG yang diizinkan"
      );
    }

    // Req 12.3 / 12.4 — validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        "Ukuran file melebihi batas maksimal 5 MB"
      );
    }

    // Req 12.5 — upload directly to Cloudinary from server (no filesystem)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let secureUrl: string;
    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: `arunika-kos/rooms/${roomId}`, resource_type: "image" },
            (error, uploadResult) => {
              if (error || !uploadResult) {
                reject(error ?? new Error("No result from Cloudinary"));
              } else {
                resolve(uploadResult as { secure_url: string });
              }
            }
          )
          .end(buffer);
      });
      secureUrl = result.secure_url;
    } catch (err) {
      // Req 12.7 — log on server, return HTTP 500 with UPLOAD_FAILED code
      console.error("[UPLOAD] Cloudinary upload failed:", err);
      throw new AppError("Gagal mengupload gambar ke Cloudinary", 500, "UPLOAD_FAILED");
    }

    // Persist image URL via repository (no direct Prisma access from service)
    const image = await roomRepo.addImage(roomId, secureUrl);

    // Req 12.6 — return the public URL
    return { image_url: image.image_url };
  },

  /**
   * Delete a room image by ID.
   * Throws NotFoundError if the image does not belong to the given room.
   */
  async deleteRoomImage(roomId: string, imageId: string) {
    const existing = await roomRepo.findImage(imageId, roomId);
    if (!existing) {
      throw new NotFoundError("Gambar tidak ditemukan");
    }
    return roomRepo.deleteImage(imageId);
  },

  /**
   * Manually change a unit's status with cascade side-effects and audit log.
   *
   * Cascade rules (Requirements 6.3, 6.7):
   *   - OCCUPIED → AVAILABLE : find ACTIVE booking for the unit → mark it DONE
   *   - RESERVED → AVAILABLE : find DP_PAID booking for the unit → mark it REJECTED;
   *                             find related DP invoice → mark it REFUND_PENDING
   *
   * An audit log entry is always created for every status transition (Requirements 6.4, 6.6).
   * All operations are wrapped in a single transaction for atomicity (Requirement 6.2).
   *
   * Requirements: 6.2, 6.3, 6.4, 6.6, 6.7
   */
  async updateUnitStatus(
    roomId: string,
    unitId: string,
    adminId: string,
    newStatus: UnitStatus,
    note?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch the unit, include its parent room for roomId verification
      const unit = await tx.roomUnit.findUnique({
        where: { id: unitId },
        include: { room: true },
      });

      if (!unit || unit.room_id !== roomId) {
        throw new NotFoundError(
          `Unit dengan ID ${unitId} tidak ditemukan pada kamar ${roomId}`
        );
      }

      // 2. Save old status
      const oldStatus = unit.status;

      // 3. No-op when status is unchanged
      if (oldStatus === newStatus) {
        return unit;
      }

      // 4. Cascade logic based on transition
      if (oldStatus === "OCCUPIED" && newStatus === "AVAILABLE") {
        // Find the ACTIVE booking for this unit and mark it DONE
        const activeBooking = await tx.booking.findFirst({
          where: { room_unit_id: unitId, status: "ACTIVE" },
        });
        if (activeBooking) {
          await tx.booking.update({
            where: { id: activeBooking.id },
            data: { status: "DONE" },
          });
        }
      } else if (oldStatus === "RESERVED" && newStatus === "AVAILABLE") {
        // Find the DP_PAID booking for this unit and mark it REJECTED
        const dpPaidBooking = await tx.booking.findFirst({
          where: { room_unit_id: unitId, status: "DP_PAID" },
        });
        if (dpPaidBooking) {
          await tx.booking.update({
            where: { id: dpPaidBooking.id },
            data: { status: "REJECTED" },
          });

          // Find the DP invoice linked to this booking and mark it REFUND_PENDING
          const dpInvoice = await tx.invoice.findFirst({
            where: { booking_id: dpPaidBooking.id, type: "DP" },
          });
          if (dpInvoice) {
            await tx.invoice.update({
              where: { id: dpInvoice.id },
              data: { status: "REFUND_PENDING" },
            });
          }
        }
      }

      // 5. Update the unit status
      const updatedUnit = await tx.roomUnit.update({
        where: { id: unitId },
        data: { status: newStatus },
      });

      // 6. Record audit log (Requirements 6.4, 6.6)
      await tx.unitStatusLog.create({
        data: {
          unit_id: unitId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: adminId,
          note: note,
        },
      });

      // 7. Return updated unit
      return updatedUnit;
    });
  },
};
