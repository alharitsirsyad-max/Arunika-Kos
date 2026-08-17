import { prisma } from "@/lib/prisma";
import type { UnitStatus } from "@prisma/client";
import type { CreateRoomInput, UpdateRoomInput } from "@/lib/types/room.types";

export const roomRepo = {
  /**
   * Fetch all rooms with their units, images, and active tenant info.
   * Each unit includes tenant name + phone from active booking (DP_PAID or ACTIVE).
   * Requirements: 10.5
   */
  async findAll() {
    const rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        period_months: true,
        facilities: true,
        description: true,
        capacity: true,
        created_at: true,
        units: {
          orderBy: { room_number: "asc" },
          select: {
            id: true,
            room_id: true,
            room_number: true,
            status: true,
            // Include active booking to get tenant info (DP_PAID = RESERVED, ACTIVE = OCCUPIED)
            bookings: {
              where: {
                status: { in: ["DP_PAID", "ACTIVE"] },
              },
              select: {
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        images: {
          select: {
            id: true,
            room_id: true,
            image_url: true,
          },
        },
      },
    });

    // Tambah info ketersediaan unit dan tenant info per unit
    // RESERVED dihitung sebagai tidak tersedia (sama dengan OCCUPIED) — Requirement 10.3
    return rooms.map((room) => ({
      ...room,
      available_units: room.units.filter((u) => u.status === "AVAILABLE").length,
      reserved_units: room.units.filter((u) => u.status === "RESERVED").length,
      total_units: room.units.length,
      units: room.units.map((unit) => {
        const activeBooking = unit.bookings?.[0] ?? null;
        return {
          id: unit.id,
          room_id: unit.room_id,
          room_number: unit.room_number,
          status: unit.status,
          tenant_name: activeBooking?.user?.name ?? null,
          tenant_phone: activeBooking?.user?.phone ?? null,
        };
      }),
    }));
  },

  /**
   * Fetch a single room by ID including its units and images.
   */
  async findById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        period_months: true,
        facilities: true,
        description: true,
        capacity: true,
        created_at: true,
        units: {
          select: {
            id: true,
            room_id: true,
            room_number: true,
            status: true,
          },
        },
        images: {
          select: {
            id: true,
            room_id: true,
            image_url: true,
          },
        },
      },
    });
  },

  /**
   * Find the first AVAILABLE unit for a given room.
   * Returns null if no available unit exists.
   */
  async findAvailableUnit(roomId: string) {
    return prisma.roomUnit.findFirst({
      where: {
        room_id: roomId,
        status: "AVAILABLE",
      },
      select: {
        id: true,
        room_id: true,
        room_number: true,
        status: true,
        room: {
          select: {
            id: true,
            name: true,
            price: true,
            facilities: true,
            description: true,
            capacity: true,
            created_at: true,
          },
        },
      },
    });
  },

  /**
   * Create a new room.
   */
  async create(data: CreateRoomInput) {
    return prisma.room.create({
      data: {
        name: data.name,
        price: data.price,
        period_months: data.period_months,
        facilities: data.facilities,
        description: data.description,
        capacity: data.capacity,
      },
      select: {
        id: true,
        name: true,
        price: true,
        period_months: true,
        facilities: true,
        description: true,
        capacity: true,
        created_at: true,
      },
    });
  },

  /**
   * Update fields of an existing room.
   */
  async update(id: string, data: UpdateRoomInput) {
    return prisma.room.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.period_months !== undefined && { period_months: data.period_months }),
        ...(data.facilities !== undefined && { facilities: data.facilities }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
      },
      select: {
        id: true,
        name: true,
        price: true,
        period_months: true,
        facilities: true,
        description: true,
        capacity: true,
        created_at: true,
      },
    });
  },

  /**
   * Delete a room by ID.
   */
  async delete(id: string) {
    return prisma.room.delete({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });
  },

  /**
   * Update the status of a specific room unit.
   */
  async updateUnitStatus(unitId: string, status: UnitStatus) {
    return prisma.roomUnit.update({
      where: { id: unitId },
      data: { status },
      select: {
        id: true,
        room_id: true,
        room_number: true,
        status: true,
      },
    });
  },

  /**
   * Count existing images for a room (used to enforce the 10-image limit).
   */
  async countImages(roomId: string) {
    return prisma.roomImage.count({ where: { room_id: roomId } });
  },

  /**
   * Persist a Cloudinary image URL for the given room.
   * Returns the created RoomImage record.
   * Requirements: 12.5, 12.6
   */
  async addImage(roomId: string, imageUrl: string) {
    return prisma.roomImage.create({
      data: { room_id: roomId, image_url: imageUrl },
      select: {
        id: true,
        room_id: true,
        image_url: true,
      },
    });
  },

  /**
   * Find a room image that belongs to the given room.
   * Returns null if no matching image is found.
   */
  async findImage(imageId: string, roomId: string) {
    return prisma.roomImage.findFirst({
      where: { id: imageId, room_id: roomId },
      select: {
        id: true,
        room_id: true,
        image_url: true,
      },
    });
  },

  /**
   * Delete a room image by its ID.
   */
  async deleteImage(imageId: string) {
    return prisma.roomImage.delete({
      where: { id: imageId },
      select: { id: true },
    });
  },
};
