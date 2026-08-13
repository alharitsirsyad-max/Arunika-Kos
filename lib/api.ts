/**
 * lib/api.ts
 * Frontend API helper — normalises fetch responses and errors from the backend.
 */

/**
 * A typed error thrown when the API returns a non-2xx response or
 * `success: false` in the response body.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
    // Restore prototype chain so instanceof checks work after TS transpilation.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Wrapper around `fetch` that:
 * 1. Parses the JSON body.
 * 2. Throws an `ApiError` when the response is not OK or `success` is false.
 * 3. Returns the typed `data` payload on success.
 *
 * @example
 * const rooms = await apiRequest<Room[]>('/api/rooms')
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options)
  const json = await res.json()

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.message ?? 'Terjadi kesalahan',
      json.error?.code ?? 'UNKNOWN_ERROR',
      res.status
    )
  }

  return json.data as T
}
