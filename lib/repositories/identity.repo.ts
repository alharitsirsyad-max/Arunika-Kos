import { prisma } from "@/lib/prisma";
import type { VerificationStatus } from "@prisma/client";
import type { CreateIdentityData } from "@/lib/types/identity.types";

/**
 * Public select — intentionally excludes document_url.
 * Used for user-facing endpoints (GET /identity-documents/me).
 * Requirement 9.4: document_url must NOT be exposed to document owner endpoint.
 */
const identityPublicSelect = {
  id: true,
  user_id: true,
  document_type: true,
  verification_status: true,
  verified_at: true,
  created_at: true,
  // document_url is intentionally excluded
} as const;

/**
 * Admin select — includes document_url and user info.
 * Used only for admin endpoints.
 */
const identityAdminSelect = {
  id: true,
  user_id: true,
  document_type: true,
  document_url: true,
  verification_status: true,
  verified_by: true,
  verified_at: true,
  created_at: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export const identityRepo = {
  /**
   * Find a document by ID — includes user data for admin log.
   * Used in verifyDocument to get owner info for audit logging.
   */
  async findById(id: string) {
    return prisma.identityDocument.findUnique({
      where: { id },
      select: identityAdminSelect,
    });
  },

  /**
   * Find all documents belonging to a specific user.
   * Strict WHERE user_id = userId filter — never returns other users' documents.
   * Does NOT return document_url (Requirement 9.4).
   */
  async findByUserId(userId: string) {
    return prisma.identityDocument.findMany({
      where: { user_id: userId },
      select: identityPublicSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Check if a user has at least one VERIFIED document.
   * Used as the identity gate in BookingService.createBooking().
   * Only selects `id` — we only need to know if a record exists.
   */
  async findVerifiedByUserId(userId: string) {
    return prisma.identityDocument.findFirst({
      where: {
        user_id: userId,
        verification_status: "VERIFIED",
      },
      select: { id: true },
    });
  },

  /**
   * Find all identity documents without ownership filter.
   * For admin use only — includes document_url and user info.
   */
  async findAll() {
    return prisma.identityDocument.findMany({
      select: identityAdminSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Create a new identity document record.
   * verification_status defaults to PENDING.
   */
  async create(data: CreateIdentityData) {
    return prisma.identityDocument.create({
      data: {
        user_id: data.user_id,
        document_type: data.document_type,
        document_url: data.document_url,
        verification_status: "PENDING",
      },
      select: identityPublicSelect,
    });
  },

  /**
   * Update the verification status of a document.
   * Sets verified_by (admin ID) and verified_at = now().
   * Only triggered by explicit admin action — never automatically.
   */
  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    verifiedBy: string
  ) {
    return prisma.identityDocument.update({
      where: { id },
      data: {
        verification_status: status,
        verified_by: verifiedBy,
        verified_at: new Date(),
      },
      select: identityPublicSelect,
    });
  },
};
