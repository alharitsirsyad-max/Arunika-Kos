import { NextResponse } from 'next/server'
import { AppError } from './AppError'
import { apiResponse } from '@/lib/utils/apiResponse'

/**
 * Converts any thrown value into a `NextResponse`.
 *
 * - `AppError` instances → structured error response using the error's own
 *   `statusCode`, `message`, and `code`.
 * - Everything else → full stack trace logged **server-side only**; client
 *   receives a generic HTTP 500 with no internal details.
 */
export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return apiResponse.error(error.message, error.statusCode, error.code)
  }

  // Log full details on the server — never forward to the client.
  console.error('[Server Error]', error)

  return apiResponse.error('Terjadi kesalahan pada server', 500, 'INTERNAL_ERROR')
}
