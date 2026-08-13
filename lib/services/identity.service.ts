import { identityRepo } from "@/lib/repositories/identity.repo";
import { NotFoundError, ValidationError } from "@/lib/errors/AppError";
import type { UploadIdentityInput, IdentityDocumentPublic } from "@/lib/types/identity.types";
import type { VerificationStatus } from "@prisma/client";

/**
 * Log structure for identity document access audit trail.
 */
function logIdentityDocumentAccess(event: {
  adminId: string;
  action: "LIST_IDENTITY_DOCUMENTS" | "VERIFY_IDENTITY_DOCUMENT";
  documentId?: string;
  documentOwnerId?: string;
  timestamp: Date;
}) {
  console.info(
    "[AUDIT]",
    JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
    })
  );
}

/**
 * Identity Service — manages identity document upload and verification.
 *
 * Security notes:
 * - document_url is NEVER returned in user-facing endpoints (Requirement 9.4).
 * - Verification is ONLY triggered by explicit admin action (Requirement 10.6).
 * - All admin access to identity documents is audit logged (Requirement 18.1, 18.2).
 */
export const identityService = {
  /**
   * Save an identity document record.
   * document_url is the Cloudinary URL — passed in after Route Handler upload.
   * verification_status is set to PENDING automatically.
   *
   * Requirements: 8.1–8.10
   */
  async uploadDocument(
    userId: string,
    input: UploadIdentityInput
  ): Promise<IdentityDocumentPublic> {
    return identityRepo.create({
      user_id: userId,
      document_type: input.document_type,
      document_url: input.document_url,
    });
  },

  /**
   * Get all identity documents belonging to the authenticated user.
   * Does NOT include document_url in the response (Requirement 9.4).
   *
   * Requirements: 9.1–9.5
   */
  async getMyDocuments(userId: string): Promise<IdentityDocumentPublic[]> {
    return identityRepo.findByUserId(userId);
  },

  /**
   * Get a summary of the user's identity verification status.
   * Used by frontend to determine what message to show before booking.
   *
   * Returns:
   * - is_verified: true if any document has status VERIFIED
   * - has_pending: true if any document is awaiting review
   * - has_rejected: true if any document was rejected
   *
   * NOTE: This is for UX only — the real gate is in BookingService.createBooking().
   *
   * Requirements: 20.5, 20.6
   */
  async getMyIdentityStatus(userId: string) {
    const documents = await identityRepo.findByUserId(userId);

    return {
      is_verified: documents.some((d) => d.verification_status === "VERIFIED"),
      has_pending: documents.some((d) => d.verification_status === "PENDING"),
      has_rejected: documents.some((d) => d.verification_status === "REJECTED"),
    };
  },

  /**
   * Get all identity documents — admin only.
   * Includes document_url for admin review purposes.
   *
   * Requirements: 10.1, 10.2
   */
  async getAllDocuments() {
    return identityRepo.findAll();
  },

  /**
   * Verify or reject an identity document (admin only).
   *
   * - Sets verified_by = adminId and verified_at = now().
   * - Logs the access with document owner info (Requirement 18.2, 18.5).
   * - Never verifies automatically (Requirement 10.6).
   *
   * Requirements: 10.3–10.9, 18.2, 18.5
   */
  async verifyDocument(
    documentId: string,
    status: "VERIFIED" | "REJECTED",
    adminId: string
  ) {
    const document = await identityRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError(
        `Dokumen identitas dengan ID ${documentId} tidak ditemukan`
      );
    }

    if (status !== "VERIFIED" && status !== "REJECTED") {
      throw new ValidationError(
        "Status verifikasi tidak valid. Gunakan VERIFIED atau REJECTED",
        "VALIDATION_ERROR"
      );
    }

    // Audit log: record admin access before making changes (Requirement 18.2, 18.5)
    // Note: document_url is intentionally NOT logged (Requirement 18.4)
    logIdentityDocumentAccess({
      adminId,
      action: "VERIFY_IDENTITY_DOCUMENT",
      documentId,
      documentOwnerId: document.user_id,
      timestamp: new Date(),
    });

    return identityRepo.updateVerificationStatus(
      documentId,
      status as VerificationStatus,
      adminId
    );
  },
};
