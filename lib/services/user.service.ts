import { userRepo } from "@/lib/repositories/user.repo";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/user";
import type { UpdateProfileInput } from "@/lib/types/user.types";

/**
 * UserService — logika bisnis manajemen pengguna.
 *
 * Requirements: 17.4, 20.1
 */
export const userService = {
  /**
   * Ambil daftar semua pengguna, dengan pencarian opsional berdasarkan
   * nama atau email.
   *
   * Field `password` TIDAK PERNAH dikembalikan — userRepo.findAll()
   * menggunakan safeUserSelect yang mengecualikan kolom password.
   *
   * Requirements: 17.4, 20.1
   */
  async getUsers(search?: string) {
    return userRepo.findAll(search);
  },

  /**
   * Perbarui profil pribadi user (nama, telepon, alamat).
   * Secara atomik:
   *   1. Update data user dan set verification_status = PENDING
   *   2. Kirim notifikasi in-app ke semua Admin dengan tipe RE_VERIFICATION_REQUESTED
   *
   * Requirements: 8.2, 8.8
   */
  async updateUserProfile(userId: string, data: UpdateProfileInput) {
    // Validasi input — lempar ZodError jika tidak valid
    const validatedData = updateProfileSchema.parse(data);

    return prisma.$transaction(async (tx) => {
      // 1. Update data user sekaligus set verification_status ke PENDING
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(validatedData.name !== undefined && { name: validatedData.name }),
          ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
          ...(validatedData.address !== undefined && { address: validatedData.address }),
          verification_status: "PENDING",
        },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          verification_status: true,
        },
      });

      // 2. Cari semua user dengan role ADMIN
      const admins = await tx.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      // 3. Buat notifikasi RE_VERIFICATION_REQUESTED untuk setiap admin
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            user_id: admin.id,
            type: "RE_VERIFICATION_REQUESTED",
            message: `User ${updatedUser.name} telah memperbarui profil dan memerlukan verifikasi ulang.`,
          })),
        });
      }

      return updatedUser;
    });
  },
};
