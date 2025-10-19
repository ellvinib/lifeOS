import { Request, Response, NextFunction } from 'express';
import { BaseError, NotFoundError, ValidationError, BusinessRuleError, DatabaseError } from '@lifeOS/core/shared/errors';

/**
 * Global Error Handler Middleware
 *
 * Handles all errors thrown in the application.
 * Converts domain errors to HTTP responses with appropriate status codes.
 *
 * Usage:
 * app.use(errorHandler);
 */
export const errorHandler = (
  error: Error | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // Handle BaseError (our custom errors)
  if (error instanceof BaseError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        status: error.statusCode,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
      },
    });
    return;
  }

  // Handle multer file upload errors
  if (error.message === 'Only PDF files are allowed') {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INVALID_FILE_TYPE',
        status: 400,
      },
    });
    return;
  }

  if (error.message.includes('File too large')) {
    res.status(400).json({
      success: false,
      error: {
        message: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE',
        status: 400,
      },
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack,
      }),
    },
  });
};

/**
 * Not Found Handler Middleware
 *
 * Handles 404 errors for undefined routes.
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      status: 404,
    },
  });
};
