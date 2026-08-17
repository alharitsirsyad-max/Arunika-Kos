import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Hasil pengecekan rate limit.
 */
export interface RateLimitResult {
  /** true → request diizinkan, false → limit sudah tercapai */
  allowed: boolean;
  /** Sisa request yang masih bisa dilakukan dalam window ini */
  remaining: number;
  /** Waktu (ms epoch) saat window rate limit di-reset */
  reset: number;
}

/**
 * Instance Ratelimit yang di-lazy-init agar tidak crash di environment
 * tanpa env vars Upstash (misal: CI atau dev lokal tanpa Redis).
 *
 * Konfigurasi: slidingWindow(5, '15m') per IP — Requirement 7.1, 7.7
 */
let ratelimit: Ratelimit | null = null;

function getRatelimiter(): Ratelimit | null {
  // Graceful degradation: skip rate limiting jika env vars tidak ada
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  if (!ratelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: false,
      prefix: "arunika:ratelimit:auth",
    });
  }

  return ratelimit;
}

/**
 * Memeriksa rate limit untuk IP address yang diberikan.
 *
 * Jika env vars Upstash tidak dikonfigurasi, selalu mengembalikan `allowed: true`
 * (graceful degradation untuk development lokal).
 *
 * @param ip - IP address dari request
 * @returns RateLimitResult
 *
 * @example
 * const result = await checkRateLimit('127.0.0.1')
 * if (!result.allowed) {
 *   return apiResponse.error('Coba lagi setelah 15 menit', 429, 'RATE_LIMIT_EXCEEDED')
 * }
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getRatelimiter();

  // Jika tidak ada limiter (env vars tidak ada), izinkan semua request
  if (!limiter) {
    return { allowed: true, remaining: 5, reset: 0 };
  }

  const { success, remaining, reset } = await limiter.limit(ip);

  return { allowed: success, remaining, reset };
}

/**
 * Instance Ratelimit per-email yang di-lazy-init.
 *
 * Konfigurasi: slidingWindow(10, '15m') per email — Requirements 4.1, 4.3
 */
let emailRatelimit: Ratelimit | null = null;

function getEmailRatelimiter(): Ratelimit | null {
  // Graceful degradation: skip rate limiting jika env vars tidak ada (Requirement 4.4)
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  if (!emailRatelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    emailRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"),
      analytics: false,
      prefix: "arunika:ratelimit:login:email",
    });
  }

  return emailRatelimit;
}

/**
 * Memeriksa rate limit berbasis email untuk endpoint login credentials.
 *
 * Rate limit ini independen dari rate limit per-IP — keduanya aktif bersamaan
 * (Requirement 4.2). Jika env vars Upstash tidak dikonfigurasi, selalu
 * mengembalikan `allowed: true` (graceful degradation — Requirement 4.4).
 *
 * @param email - Email address dari user yang mencoba login
 * @returns RateLimitResult
 *
 * @example
 * const result = await checkEmailRateLimit('user@example.com')
 * if (!result.allowed) {
 *   return apiResponse.error('Coba lagi setelah 15 menit', 429, 'RATE_LIMIT_EXCEEDED')
 * }
 */
export async function checkEmailRateLimit(
  email: string
): Promise<RateLimitResult> {
  const limiter = getEmailRatelimiter();

  // Jika tidak ada limiter (env vars tidak ada), izinkan semua request
  if (!limiter) {
    return { allowed: true, remaining: 10, reset: 0 };
  }

  const { success, remaining, reset } = await limiter.limit(
    email.toLowerCase()
  );

  return { allowed: success, remaining, reset };
}
