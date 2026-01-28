/**
 * Custom error classes for consistent error handling across the application
 */

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 400 Bad Request
 * Invalid input data or malformed requests
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', code: string = 'VALIDATION_ERROR') {
    super(message, 400, code)
  }
}

/**
 * 401 Unauthorized
 * Missing or invalid authentication
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'AUTH_ERROR') {
    super(message, 401, code)
  }
}

/**
 * 403 Forbidden
 * Valid authentication but insufficient permissions
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN') {
    super(message, 403, code)
  }
}

/**
 * 404 Not Found
 * Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code)
  }
}

/**
 * 409 Conflict
 * Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code)
  }
}

/**
 * 429 Too Many Requests
 * Rate limit exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(message: string = 'Too many requests', retryAfter: number = 60, code: string = 'RATE_LIMIT') {
    super(message, 429, code)
    this.retryAfter = retryAfter
  }
}

/**
 * 500 Internal Server Error
 * Unexpected server errors
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
    super(message, 500, code, false) // not operational - unexpected error
  }
}

/**
 * 503 Service Unavailable
 * Temporary service outage (database down, etc.)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', code: string = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code)
  }
}

/**
 * Error response interface for consistent API responses
 */
export interface ErrorResponse {
  error: string
  code: string
  statusCode: number
  timestamp: string
  details?: unknown
}

/**
 * Convert error to consistent JSON response
 */
export function errorToResponse(error: Error | AppError): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    }
  }

  // Unknown error - don't expose internal details
  return {
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if error is operational (expected) or programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational
  }
  return false
}

/**
 * Log error appropriately based on type
 */
export function logError(error: Error | AppError, context?: string): void {
  const timestamp = new Date().toISOString()
  const prefix = context ? `[${context}]` : ''

  if (isAppError(error)) {
    if (error.isOperational) {
      // Operational errors are expected and can be handled
      // Log at info level for visibility without alarming
      console.warn(`${timestamp} ${prefix} Operational Error [${error.code}]:`, error.message)
    } else {
      // Programming errors need immediate attention
      console.error(`${timestamp} ${prefix} Programming Error [${error.code}]:`, error.message, error.stack)
    }
  } else {
    // Unknown errors are potential bugs
    console.error(`${timestamp} ${prefix} Unknown Error:`, error.message, error.stack)
  }
}
