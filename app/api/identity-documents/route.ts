import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { uploadIdentityDocumentSchema } from "@/lib/validations/identity";
import { identityService } from "@/lib/services/identity.service";
import { apiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/errors/handleError";
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors/AppError";

/** Max file size: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** JPEG magic bytes: FF D8 FF */
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
/** PNG magic bytes: 89 50 4E 47 */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

/**
 * Validate file type by reading magic number (first bytes).
 * Must be called BEFORE uploading to Cloudinary.
 * (Requirements 8.4, 14.1–14.3)
 */
async function validateMagicNumber(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 4));

  const isJpeg = JPEG_MAGIC.every((b, i) => bytes[i] === b);
  const isPng = PNG_MAGIC.every((b, i) => bytes[i] === b);

  if (!isJpeg && !isPng) {
    throw new ValidationError(
      "Tipe file tidak valid. Hanya JPEG dan PNG yang diterima.",
      "INVALID_FILE_TYPE"
    );
  }
}

/**
 * POST /api/identity-documents — upload dokumen identitas (user)
 * Auth: USER (login required)
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Baca FormData: file + document_type
 * 3. Cek ukuran file ≤ 5MB → ValidationError (FILE_TOO_LARGE)
 * 4. Validasi magic number → ValidationError (INVALID_FILE_TYPE)
 * 5. Upload ke Cloudinary folder 'identity-documents/' dengan type: 'private'
 * 6. Validasi Zod uploadIdentityDocumentSchema
 * 7. identityService.uploadDocument() → apiResponse.created()
 *
 * Requirements: 8.1–8.10, 14.1–14.4, 17.1–17.4
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("document_type") as string | null;

    if (!file) {
      throw new ValidationError("File dokumen wajib disertakan", "VALIDATION_ERROR");
    }

    // Step 3: Check file size before reading magic number (Requirement 14.4)
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        "Ukuran file melebihi batas maksimal 5MB",
        "FILE_TOO_LARGE"
      );
    }

    // Step 4: Validate magic number BEFORE uploading (Requirement 14.1–14.3)
    await validateMagicNumber(file);

    // Step 5: Upload to Cloudinary with private delivery
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: "identity-documents",
      type: "private",
      access_mode: "authenticated",
    });

    // Step 6: Validate document_type via Zod
    const parsed = uploadIdentityDocumentSchema.safeParse({
      document_type: documentType,
      document_url: uploadResult.secure_url,
    });
    if (!parsed.success) {
      throw new ValidationError(
        `Validasi gagal: ${JSON.stringify(parsed.error.flatten())}`
      );
    }

    // Step 7: Save to DB via service
    const userId = session.user!.id!;
    const document = await identityService.uploadDocument(userId, parsed.data);

    return apiResponse.created(document, "Dokumen identitas berhasil diunggah");
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/identity-documents — daftar semua dokumen identitas (admin only)
 * Auth: ADMIN only
 *
 * Flow:
 * 1. Auth check → UnauthorizedError (401)
 * 2. Role check: ADMIN → ForbiddenError (403)
 * 3. Log akses: adminId + LIST_IDENTITY_DOCUMENTS + timestamp (Requirement 18.1)
 * 4. identityService.getAllDocuments() → apiResponse.success()
 *
 * Requirements: 10.1–10.2, 18.1, 17.1–17.4
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      throw new UnauthorizedError("Belum login");
    }

    const userId = session.user!.id!;
    const role = (session.user as { role: string }).role;

    if (role !== "ADMIN") {
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";
      console.warn(
        `[SECURITY] ${new Date().toISOString()} | Non-admin tried GET /api/identity-documents | userId=${userId} | ip=${ip}`
      );
      throw new ForbiddenError(
        "Hanya admin yang dapat mengakses daftar dokumen identitas",
        "FORBIDDEN"
      );
    }

    // Log admin access (Requirement 18.1)
    console.info(
      "[AUDIT]",
      JSON.stringify({
        adminId: userId,
        action: "LIST_IDENTITY_DOCUMENTS",
        timestamp: new Date().toISOString(),
      })
    );

    const documents = await identityService.getAllDocuments();
    return apiResponse.success(documents, "Berhasil mengambil daftar dokumen identitas");
  } catch (error) {
    return handleError(error);
  }
}
