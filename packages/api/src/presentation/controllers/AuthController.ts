import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../infrastructure/auth/AuthService';
import { AuthenticatedRequest, getUserId } from '../../infrastructure/auth/authMiddleware';
import { ValidationError, NotFoundError } from '@lifeOS/core/shared/errors';

/**
 * Authentication Controller
 *
 * Handles user registration, login, token refresh, and user info retrieval
 */
export class AuthController {
  private authService: AuthService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.authService = new AuthService();
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Validate required fields
      if (!email || !password || !name) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Email, password, and name are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Validate email format
      const emailValidation = this.authService.validateEmail(email);
      if (emailValidation.isFail()) {
        res.status(400).json({
          error: 'Validation Error',
          message: emailValidation.error.message,
          code: emailValidation.error.code,
          details: (emailValidation.error as ValidationError).validationErrors,
        });
        return;
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'Conflict',
          message: 'User with this email already exists',
          code: 'USER_EXISTS',
        });
        return;
      }

      // Hash password
      const hashResult = await this.authService.hashPassword(password);
      if (hashResult.isFail()) {
        res.status(400).json({
          error: 'Validation Error',
          message: hashResult.error.message,
          code: hashResult.error.code,
          details: (hashResult.error as ValidationError).validationErrors,
        });
        return;
      }

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashResult.value,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokenResult = this.authService.generateTokenPair(user.id, user.email);
      if (tokenResult.isFail()) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate authentication tokens',
          code: 'TOKEN_GENERATION_ERROR',
        });
        return;
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        tokens: tokenResult.value,
      });
    } catch (error) {
      console.error('[AuthController] Register error:', error);
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Email and password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Verify password
      const verifyResult = await this.authService.verifyPassword(password, user.password);
      if (verifyResult.isFail() || !verifyResult.value) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Generate tokens
      const tokenResult = this.authService.generateTokenPair(user.id, user.email);
      if (tokenResult.isFail()) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate authentication tokens',
          code: 'TOKEN_GENERATION_ERROR',
        });
        return;
      }

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        tokens: tokenResult.value,
      });
    } catch (error) {
      console.error('[AuthController] Login error:', error);
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
        });
        return;
      }

      // Verify refresh token
      const verifyResult = this.authService.verifyRefreshToken(refreshToken);
      if (verifyResult.isFail()) {
        res.status(401).json({
          error: 'Unauthorized',
          message: verifyResult.error.message,
          code: verifyResult.error.code,
        });
        return;
      }

      // Check if user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: verifyResult.value.userId },
      });

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User no longer exists',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Generate new token pair
      const tokenResult = this.authService.generateTokenPair(user.id, user.email);
      if (tokenResult.isFail()) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate authentication tokens',
          code: 'TOKEN_GENERATION_ERROR',
        });
        return;
      }

      res.status(200).json({
        message: 'Token refreshed successfully',
        tokens: tokenResult.value,
      });
    } catch (error) {
      console.error('[AuthController] Refresh error:', error);
      next(error);
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   * Requires authentication
   */
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);

      // Fetch user from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        user,
      });
    } catch (error) {
      console.error('[AuthController] GetMe error:', error);
      next(error);
    }
  }

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Note: Since we're using stateless JWT, actual logout happens client-side
      // by removing tokens from storage. This endpoint is mainly for logging/tracking.

      const userId = getUserId(req);

      console.log(`[AuthController] User ${userId} logged out`);

      res.status(200).json({
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('[AuthController] Logout error:', error);
      next(error);
    }
  }

  /**
   * Update user profile
   * PATCH /api/auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { name, email } = req.body;

      // Validate at least one field is provided
      if (!name && !email) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'At least one field (name or email) must be provided',
          code: 'NO_FIELDS_TO_UPDATE',
        });
        return;
      }

      // If email is being updated, validate and check for conflicts
      if (email) {
        const emailValidation = this.authService.validateEmail(email);
        if (emailValidation.isFail()) {
          res.status(400).json({
            error: 'Validation Error',
            message: emailValidation.error.message,
            code: emailValidation.error.code,
          });
          return;
        }

        // Check if email is already taken by another user
        const existingUser = await this.prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          res.status(409).json({
            error: 'Conflict',
            message: 'Email is already taken',
            code: 'EMAIL_TAKEN',
          });
          return;
        }
      }

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email: email.toLowerCase() }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('[AuthController] UpdateProfile error:', error);
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Current password and new password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Fetch user with password
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Verify current password
      const verifyResult = await this.authService.verifyPassword(currentPassword, user.password);
      if (verifyResult.isFail() || !verifyResult.value) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Current password is incorrect',
          code: 'INVALID_PASSWORD',
        });
        return;
      }

      // Hash new password
      const hashResult = await this.authService.hashPassword(newPassword);
      if (hashResult.isFail()) {
        res.status(400).json({
          error: 'Validation Error',
          message: hashResult.error.message,
          code: hashResult.error.code,
          details: (hashResult.error as ValidationError).validationErrors,
        });
        return;
      }

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashResult.value },
      });

      res.status(200).json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('[AuthController] ChangePassword error:', error);
      next(error);
    }
  }
}
