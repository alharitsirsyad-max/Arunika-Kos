import type {
  IdentityDocument,
  DocumentType,
  VerificationStatus,
} from "@prisma/client";

/**
 * Input for uploading an identity document.
 * document_url is the Cloudinary URL after upload — not the raw file.
 */
export type UploadIdentityInput = {
  document_type: DocumentType;
  document_url: string;
};

/**
 * Public-facing identity document data returned to the document owner.
 * Intentionally excludes document_url to prevent exposure of private URLs.
 */
export type IdentityDocumentPublic = {
  id: string;
  document_type: DocumentType;
  verification_status: VerificationStatus;
  verified_at: Date | null;
  created_at: Date;
  // document_url is intentionally excluded — see Requirement 9.4
};

/**
 * Internal data used by the repository when creating a document record.
 */
export type CreateIdentityData = {
  user_id: string;
  document_type: DocumentType;
  document_url: string;
};

// Re-export Prisma types for convenience
export type { IdentityDocument, DocumentType, VerificationStatus };
