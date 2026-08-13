import { NextResponse } from 'next/server'

/** Shape returned by success and created responses */
interface SuccessBody<T> {
  success: true
  data: T
  message: string
}

/** Shape returned by error responses */
interface ErrorBody {
  success: false
  error: {
    code: string
    message: string
  }
}

export const apiResponse = {
  /**
   * Returns a JSON response with `{ success: true, data, message }`.
   * Defaults to HTTP 200 unless `status` is provided.
   */
  success<T>(data: T, message: string, status = 200): NextResponse<SuccessBody<T>> {
    return NextResponse.json<SuccessBody<T>>(
      { success: true, data, message },
      { status }
    )
  },

  /**
   * Convenience wrapper for HTTP 201 Created.
   * Returns `{ success: true, data, message }`.
   */
  created<T>(data: T, message: string): NextResponse<SuccessBody<T>> {
    return NextResponse.json<SuccessBody<T>>(
      { success: true, data, message },
      { status: 201 }
    )
  },

  /**
   * Returns a JSON error response with `{ success: false, error: { code, message } }`.
   */
  error(message: string, status: number, code: string): NextResponse<ErrorBody> {
    return NextResponse.json<ErrorBody>(
      { success: false, error: { code, message } },
      { status }
    )
  },
}
