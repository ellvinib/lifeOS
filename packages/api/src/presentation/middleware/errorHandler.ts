import type { Request, Response, NextFunction } from 'express';
import { BaseError, ErrorCodeToHttpStatus } from '@lifeos/core';

/**
 * Error response interface.
 * What we send to clients when errors occur.
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

/**
 * Global error handling middleware.
 *
 * Design principles:
 * - Catches ALL errors (sync and async)
 * - Converts errors to HTTP responses
 * - Logs errors appropriately
 * - Hides sensitive information from clients
 * - Single Responsibility: Only handles errors
 *
 * This should be the LAST middleware in the chain.
 *
 * Usage:
 * ```typescript
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    next(error);
    return;
  }

  // Handle our custom BaseError types
  if (error instanceof BaseError) {
    handleBaseError(error, req, res);
    return;
  }

  // Handle unexpected errors
  handleUnexpectedError(error, req, res);
}

/**
 * Handle errors that extend BaseError.
 * These are expected errors with proper structure.
 */
function handleBaseError(error: BaseError, req: Request, res: Response): void {
  // Log error if configured to do so
  if (error.shouldLog) {
    logError(error, req);
  }

  // Report error to external service if configured
  if (error.shouldReport) {
    // In production, send to Sentry, Datadog, etc.
    // For now, just log
    console.error('[ERROR REPORT]', error.toJSON());
  }

  // Build error response
  const response: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
    },
  };

  // Include details for validation errors
  if (error.name === 'ValidationError') {
    const validationError = error as BaseError & { errors?: unknown };
    response.error.details = validationError.errors;
  }

  // Send response
  res.status(error.statusCode).json(response);
}

/**
 * Handle unexpected errors (not BaseError).
 * These should be logged and reported, but details hidden from client.
 */
function handleUnexpectedError(error: Error, req: Request, res: Response): void {
  // Log the full error
  console.error('[UNEXPECTED ERROR]', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  });

  // In production, report to external service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, Datadog, etc.
  }

  // Send generic error response (hide details)
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message, // In dev, show actual message
      timestamp: new Date().toISOString(),
    },
  };

  res.status(500).json(response);
}

/**
 * Log error with request context.
 */
function logError(error: BaseError, req: Request): void {
  console.error('[ERROR]', {
    code: error.code,
    message: error.message,
    url: req.url,
    method: req.method,
    statusCode: error.statusCode,
    context: error.context,
    timestamp: error.timestamp,
  });
}

/**
 * Not found handler.
 * Handles requests to routes that don't exist.
 *
 * Usage:
 * ```typescript
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 * ```
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(404).json(response);
}
