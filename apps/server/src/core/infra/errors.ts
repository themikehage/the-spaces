export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class HttpError extends AppError {}

export class BadRequestError extends HttpError {
  constructor(
    code = "BAD_REQUEST",
    message = "Invalid request payload or parameters",
    details?: unknown,
  ) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(code = "UNAUTHORIZED", message = "Authentication required", details?: unknown) {
    super(401, code, message, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(code = "FORBIDDEN", message = "Access denied", details?: unknown) {
    super(403, code, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(code = "NOT_FOUND", message = "Resource not found", details?: unknown) {
    super(404, code, message, details);
  }
}

export class ConflictError extends HttpError {
  constructor(code = "CONFLICT", message = "Resource conflict", details?: unknown) {
    super(409, code, message, details);
  }
}

export class InternalError extends AppError {
  constructor(
    code = "INTERNAL_ERROR",
    message = "An unexpected error occurred",
    details?: unknown,
  ) {
    super(500, code, message, details);
  }
}
