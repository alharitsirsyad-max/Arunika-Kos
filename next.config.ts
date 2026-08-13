import type { NextConfig } from "next";

/**
 * Content-Security-Policy
 *
 * script-src:
 *   - 'self'                         → file JS kita sendiri
 *   - 'unsafe-inline'                → Next.js inline scripts (dev & prod)
 *   - 'unsafe-eval'                  → React dev mode (error overlay, stack traces)
 *   - https://app.sandbox.midtrans.com → Midtrans Snap (sandbox)
 *   - https://app.midtrans.com       → Midtrans Snap (production)
 *   - https://www.google-analytics.com → injected oleh Midtrans
 *
 * style-src:
 *   - 'self' 'unsafe-inline'         → Tailwind CSS v4 + inline styles
 *
 * img-src:
 *   - 'self' data: blob:             → gambar lokal + data URI
 *   - https://res.cloudinary.com     → gambar yang diupload ke Cloudinary
 *
 * connect-src:
 *   - 'self'                         → API routes
 *   - https://app.sandbox.midtrans.com
 *   - https://api.sandbox.midtrans.com
 *
 * frame-src:
 *   - https://app.sandbox.midtrans.com → Midtrans Snap popup/iframe
 *   - https://app.midtrans.com
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.sandbox.midtrans.com https://app.midtrans.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  "connect-src 'self' https://app.sandbox.midtrans.com https://api.sandbox.midtrans.com https://app.midtrans.com https://api.midtrans.com",
  "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-right",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
