// Shared/common types used across the entire application

/**
 * Standard API response for successful operations.
 */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message: string;
};

/**
 * Standard API response for failed operations.
 */
export type ApiErrorResponse = {
  success: false;
  error: ApiError;
};

/**
 * Union type representing all possible API responses.
 * Use this as the return type when you need to handle both success and failure.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Error details included in failed API responses.
 */
export type ApiError = {
  code: string;
  message: string;
};
