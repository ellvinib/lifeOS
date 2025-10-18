import { Request, Response, NextFunction } from 'express';
import { AuthService } from './AuthService';
import { BaseError } from '@lifeOS/core/shared/errors';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Authentication Middleware
 *
 * Validates JWT token and attaches user info to request
 * Usage: app.use(authMiddleware) or router.get('/protected', authMiddleware, handler)
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization token provided',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Check Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT',
      });
      return;
    }

    const token = parts[1];

    // Verify token
    const authService = new AuthService();
    const result = authService.verifyAccessToken(token);

    if (result.isFail()) {
      const error = result.error as BaseError;
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
        code: error.code,
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: result.value.userId,
      email: result.value.email,
    };

    // Continue to next middleware/handler
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Unexpected error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Attempts to authenticate but doesn't fail if token is missing/invalid
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      next();
      return;
    }

    const token = parts[1];

    // Try to verify token
    const authService = new AuthService();
    const result = authService.verifyAccessToken(token);

    if (result.isOk()) {
      // Token valid, attach user
      req.user = {
        userId: result.value.userId,
        email: result.value.email,
      };
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    // Log but don't fail
    console.error('[OptionalAuthMiddleware] Error:', error);
    next();
  }
}

/**
 * Extract userId from authenticated request
 * Throws error if not authenticated (for use in handlers after authMiddleware)
 */
export function getUserId(req: AuthenticatedRequest): string {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user.userId;
}

/**
 * Extract user email from authenticated request
 * Throws error if not authenticated (for use in handlers after authMiddleware)
 */
export function getUserEmail(req: AuthenticatedRequest): string {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user.email;
}
