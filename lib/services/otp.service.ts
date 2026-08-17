import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/brevo";
import { hash, compare } from "bcryptjs";

const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60; // Tunggu 60 detik sebelum kirim ulang
const MAX_OTP_ATTEMPTS = 5; // Maksimum percobaan verifikasi OTP yang diizinkan
const OTP_HASH_ROUNDS = 10; // Lebih rendah dari password (12) karena OTP berumur pendek

/**
 * Generate 6-digit OTP code.
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const otpService = {
  /**
   * Buat dan kirim OTP ke email.
   * Rate limit: tidak boleh kirim OTP baru jika OTP sebelumnya masih < 60 detik.
   */
  async sendOtp(
    email: string,
    name: string,
    purpose: "register" | "login"
  ): Promise<void> {
    // Cek cooldown
    const recent = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (recent) {
      const secondsAgo = (Date.now() - recent.created_at.getTime()) / 1000;
      if (secondsAgo < OTP_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_COOLDOWN_SECONDS - secondsAgo);
        throw new Error(`Tunggu ${waitSeconds} detik sebelum meminta OTP baru`);
      }
    }

    // Invalidate OTP lama
    await prisma.otpCode.updateMany({
      where: { email, purpose, used: false },
      data: { used: true },
    });

    // Buat OTP baru
    const code = generateOtp();
    const hashedCode = await hash(code, OTP_HASH_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: { email, code: hashedCode, purpose, expires_at: expiresAt },
    });

    // Kirim plain-text ke email — tidak pernah disimpan ke DB
    await sendOtpEmail(email, name, code, purpose);
  },

  /**
   * Verifikasi OTP yang dimasukkan user.
   * Return true jika valid, throw Error jika tidak valid.
   * Dilindungi oleh brute-force protection: maks 5 percobaan gagal.
   */
  async verifyOtp(
    email: string,
    code: string,
    purpose: "register" | "login"
  ): Promise<void> {
    const otp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!otp) {
      throw new Error("Kode OTP tidak valid atau sudah kadaluarsa");
    }

    // Cek apakah sudah melebihi max attempts — invalidate paksa jika iya
    if (otp.attempt_count >= MAX_OTP_ATTEMPTS) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { used: true },
      });
      throw new Error(
        "OTP telah dinonaktifkan karena terlalu banyak percobaan. Minta OTP baru."
      );
    }

    const isValid = await compare(code, otp.code);
    if (!isValid) {
      const newCount = otp.attempt_count + 1;
      if (newCount >= MAX_OTP_ATTEMPTS) {
        // Percobaan ke-5 salah → invalidate sekaligus
        await prisma.otpCode.update({
          where: { id: otp.id },
          data: { used: true, attempt_count: newCount },
        });
        throw new Error(
          "OTP telah dinonaktifkan karena terlalu banyak percobaan. Minta OTP baru."
        );
      }
      // Increment attempt_count
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempt_count: newCount },
      });
      throw new Error("Kode OTP salah");
    }

    // Kode benar — tandai sebagai sudah dipakai
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });
  },

  /**
   * Bersihkan OTP yang sudah expired.
   * Bisa dipanggil secara periodik.
   */
  async cleanup(): Promise<number> {
    const result = await prisma.otpCode.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { used: true },
        ],
      },
    });
    return result.count;
  },
};
