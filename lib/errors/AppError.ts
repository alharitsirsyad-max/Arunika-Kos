/**
 * Base application error class.
 * All domain errors should extend this class so they can be
 * identified by `handleError` and converted to the correct HTTP response.
 */
export class AppError extends Error {
  constructor(
    public override readonly message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
    // Restore prototype chain so `instanceof` checks work correctly
    // after TypeScript transpilation.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** 404 — requested resource does not exist */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
  }
}

/** 409 — resource state conflict (e.g. duplicate entry, unit already occupied) */
export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(message, 409, code)
  }
}

/** 400 — input failed validation */
export class ValidationError extends AppError {
  constructor(message: string, code = "VALIDATION_ERROR") {
    super(message, 400, code);
  }
}

/** 403 — caller is authenticated but not authorised for this resource */
export class ForbiddenError extends AppError {
  constructor(message: string, code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

/** 401 — caller is not authenticated */
export class UnauthorizedError extends AppError {
  constructor(message: string, code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}
