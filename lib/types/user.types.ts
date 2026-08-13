import type { User, VerificationStatus } from "@prisma/client";

/**
 * Input for updating a user's personal profile data.
 * All fields are optional — only provided fields will be updated.
 * Saving any of these fields triggers a re-verification (verification_status → PENDING).
 * Requirements: 8.1, 8.2
 */
export type UpdateProfileInput = {
  name?: string;
  phone?: string;
  address?: string;
};

// Re-export Prisma types for convenience
export type { User, VerificationStatus };
