import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/brevo";

const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60; // Tunggu 60 detik sebelum kirim ulang

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
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: { email, code, purpose, expires_at: expiresAt },
    });

    // Kirim via Brevo
    await sendOtpEmail(email, name, code, purpose);
  },

  /**
   * Verifikasi OTP yang dimasukkan user.
   * Return true jika valid, throw Error jika tidak valid.
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

    if (otp.code !== code) {
      throw new Error("Kode OTP salah");
    }

    // Tandai sebagai sudah dipakai
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
