import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../../infrastructure/auth/AuthService';

/**
 * Extend Express Request to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication Middleware
 *
 * Verifies JWT token and attaches user information to request
 *
 * Usage:
 * ```ts
 * router.get('/protected', authenticate, (req, res) => {
 *   const userId = req.user!.userId;
 *   // ... use userId
 * });
 * ```
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No authorization header provided',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid authorization header format. Expected: Bearer <token>',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = parts[1];

    // Verify token using AuthService
    const authService = new AuthService();
    const result = authService.verifyAccessToken(token);

    if (result.isFail()) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: result.error.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach user information to request
    req.user = result.value;

    // Continue to next middleware/handler
    next();
  } catch (error) {
    console.error('[Authentication Middleware] Error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Attaches user information if token is provided, but doesn't fail if missing
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
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
    const authService = new AuthService();
    const result = authService.verifyAccessToken(token);

    if (result.isOk()) {
      // Valid token, attach user
      req.user = result.value;
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    // Log error but don't fail the request
    console.error('[Optional Authentication Middleware] Error:', error);
    next();
  }
}
