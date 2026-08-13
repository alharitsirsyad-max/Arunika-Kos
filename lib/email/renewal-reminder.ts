/**
 * lib/email/renewal-reminder.ts
 *
 * Helper untuk mengirim email reminder perpanjangan sewa via Brevo.
 * Mengikuti pola yang sama dengan sendOtpEmail di lib/brevo.ts.
 */

import { sendEmail } from "@/lib/brevo";

interface RenewalReminderParams {
  roomNumber: string;
  endDate: Date;
  remainingDays: number;
}

/**
 * Kirim email reminder perpanjangan sewa ke user.
 * Hanya dipanggil jika user.email_verified === true.
 */
export async function sendRenewalReminderEmail(
  email: string,
  params: RenewalReminderParams
): Promise<void> {
  const { roomNumber, endDate, remainingDays } = params;

  const endDateFormatted = endDate.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await sendEmail({
    to: { email },
    subject: `Reminder: Masa Sewa Kamar ${roomNumber} Akan Berakhir dalam ${remainingDays} Hari`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a;">Arunika Kos</h1>
        </div>

        <p style="font-size: 16px;">Halo,</p>

        <p style="font-size: 15px; color: #444;">
          Kami ingin mengingatkan bahwa masa sewa kamar Anda akan segera berakhir.
        </p>

        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; font-weight: 600;">
            ⚠️ Informasi Masa Sewa
          </p>
          <table style="width: 100%; font-size: 14px; color: #78350f;">
            <tr>
              <td style="padding: 4px 0;">Nomor Kamar</td>
              <td style="padding: 4px 0; font-weight: 600;">${roomNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">Tanggal Berakhir</td>
              <td style="padding: 4px 0; font-weight: 600;">${endDateFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">Sisa Hari</td>
              <td style="padding: 4px 0; font-weight: 600; color: #dc2626;">${remainingDays} hari lagi</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #444;">
          Segera ajukan perpanjangan sewa melalui dashboard Anda agar kamar tidak dilepas ke penyewa lain.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a
            href="${process.env.NEXTAUTH_URL ?? "https://arunikakos.com"}/dashboard"
            style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;"
          >
            Ajukan Perpanjangan
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          Email ini dikirim secara otomatis oleh sistem Arunika Kos. Jika Anda sudah mengajukan perpanjangan, abaikan email ini.
        </p>
      </body>
      </html>
    `,
    textContent: `Reminder Perpanjangan Sewa - Arunika Kos\n\nKamar ${roomNumber} Anda akan berakhir pada ${endDateFormatted} (${remainingDays} hari lagi).\n\nSegera ajukan perpanjangan melalui dashboard: ${process.env.NEXTAUTH_URL ?? "https://arunikakos.com"}/dashboard`,
  });
}
