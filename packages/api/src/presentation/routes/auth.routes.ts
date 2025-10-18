import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../../infrastructure/auth/authMiddleware';

/**
 * Create authentication routes
 */
export function createAuthRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const authController = new AuthController(prisma);

  /**
   * Public routes (no authentication required)
   */

  // Register new user
  router.post('/register', (req, res, next) => authController.register(req, res, next));

  // Login
  router.post('/login', (req, res, next) => authController.login(req, res, next));

  // Refresh access token
  router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

  /**
   * Protected routes (authentication required)
   */

  // Get current user info
  router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));

  // Logout (mainly for logging/tracking)
  router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));

  // Update user profile
  router.patch('/profile', authMiddleware, (req, res, next) =>
    authController.updateProfile(req, res, next)
  );

  // Change password
  router.post('/change-password', authMiddleware, (req, res, next) =>
    authController.changePassword(req, res, next)
  );

  return router;
}
