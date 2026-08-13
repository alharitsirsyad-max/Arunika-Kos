import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimit";

/**
 * Ambil IP address dari request headers.
 * Mendukung proxy seperti Vercel / Cloudflare yang meneruskan IP via x-forwarded-for.
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Auth endpoints yang diproteksi oleh rate limiter.
 * - /api/auth/callback/credentials → Auth.js Credentials login (POST)
 * - /api/auth/register → registrasi pengguna baru (POST) — juga ditangani di route handler
 *
 * Requirement 7.3: rate limiter diterapkan di endpoint register DAN login Auth.js
 */
const RATE_LIMITED_PATHS = [
  "/api/auth/callback/credentials",
  "/api/auth/register",
];

export default auth(async (req) => {
  const { nextUrl, auth: session, method } = req;
  const isLoggedIn = !!session;
  const userRole = (session?.user as { role?: string })?.role;

  // ─── Rate Limiting untuk endpoint autentikasi ─────────────────────────────
  // Hanya terapkan pada POST request ke path yang terdaftar
  // Requirement 7.1, 7.2, 7.3, 7.7
  if (method === "POST" && RATE_LIMITED_PATHS.includes(nextUrl.pathname)) {
    const ip = getClientIp(req as NextRequest);
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Coba lagi setelah 15 menit",
          },
        },
        { status: 429 }
      );
    }
  }

  // ─── Proteksi rute /admin/* dan /dashboard/* ──────────────────────────────
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  if (isAdminRoute || isDashboardRoute) {
    // Belum login → redirect ke halaman login
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Login sebagai USER tapi coba akses /admin/* → halaman akses ditolak
    if (isAdminRoute && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Jalankan middleware pada rute yang perlu dilindungi + rute autentikasi untuk rate limiting
  // Kecualikan aset statis, file, dan rute lain yang tidak relevan
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/api/auth/callback/credentials",
    "/api/auth/register",
  ],
};
