/**
 * lib/brevo.ts
 * Brevo (ex Sendinblue) transactional email client.
 * Digunakan untuk mengirim OTP via email.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailOptions {
  to: { email: string; name?: string }
  subject: string
  htmlContent: string
  textContent?: string
}

/**
 * Kirim email transaksional via Brevo API.
 * Menggunakan fetch langsung tanpa SDK tambahan.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL ?? "noreply@arunikakos.com";
  const fromName = process.env.BREVO_FROM_NAME ?? "Arunika Kos";

  if (!apiKey) {
    console.error("[BREVO] BREVO_API_KEY tidak dikonfigurasi");
    throw new Error("Email service tidak dikonfigurasi");
  }

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [options.to],
    subject: options.subject,
    htmlContent: options.htmlContent,
    textContent: options.textContent,
  };

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("[BREVO] Gagal kirim email:", res.status, error);
    const detail = (error as { message?: string }).message ?? JSON.stringify(error);
    throw new Error(`Gagal mengirim email (${res.status}): ${detail}`);
  }
}

/**
 * Kirim OTP ke email user.
 */
export async function sendOtpEmail(
  email: string,
  name: string,
  otp: string,
  purpose: "register" | "login"
): Promise<void> {
  const purposeLabel = purpose === "register" ? "Verifikasi Akun" : "Masuk";

  await sendEmail({
    to: { email, name },
    subject: `Kode OTP ${purposeLabel} - Arunika Kos`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a;">Arunika Kos</h1>
        </div>
        
        <p style="font-size: 16px;">Halo, <strong>${name}</strong>!</p>
        
        <p style="font-size: 15px; color: #444;">
          ${purpose === "register"
            ? "Terima kasih telah mendaftar di Arunika Kos. Gunakan kode berikut untuk memverifikasi akun Anda:"
            : "Gunakan kode berikut untuk masuk ke akun Arunika Kos Anda:"}
        </p>
        
        <div style="background: #f5f5f5; border: 2px dashed #d1d5db; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #111;">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          ⏱️ Kode ini berlaku selama <strong>10 menit</strong>.
        </p>
        <p style="font-size: 14px; color: #666;">
          🔒 Jangan bagikan kode ini kepada siapapun, termasuk tim Arunika Kos.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          Email ini dikirim secara otomatis. Jika Anda tidak merasa mendaftar, abaikan email ini.
        </p>
      </body>
      </html>
    `,
    textContent: `Kode OTP ${purposeLabel} Anda: ${otp}\nBerlaku 10 menit. Jangan bagikan kode ini.`,
  });
}
