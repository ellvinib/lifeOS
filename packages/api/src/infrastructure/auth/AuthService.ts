import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Result } from '@lifeOS/core/shared/result';
import { ValidationError } from '@lifeOS/core/shared/errors';

/**
 * JWT Payload Structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number; // issued at
  exp?: number; // expiration
}

/**
 * Token Pair (Access + Refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Authentication Service
 *
 * Handles:
 * - Password hashing and verification
 * - JWT token generation and validation
 * - Token refresh mechanism
 */
export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRATION: string;
  private readonly REFRESH_TOKEN_SECRET: string;
  private readonly REFRESH_TOKEN_EXPIRATION: string;
  private readonly SALT_ROUNDS = 10;

  constructor() {
    // Load from environment variables
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d'; // 7 days
    this.REFRESH_TOKEN_SECRET =
      process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production';
    this.REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '30d'; // 30 days

    // Warn if using default secrets in production
    if (process.env.NODE_ENV === 'production' && this.JWT_SECRET.includes('change-in-production')) {
      console.warn('⚠️  WARNING: Using default JWT secret in production! Set JWT_SECRET in environment.');
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<Result<string, ValidationError>> {
    try {
      // Validate password strength
      const validation = this.validatePasswordStrength(password);
      if (validation.isFail()) {
        return Result.fail(validation.error);
      }

      const hash = await bcrypt.hash(password, this.SALT_ROUNDS);
      return Result.ok(hash);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to hash password', [
          { field: 'password', message: 'Password hashing failed' },
        ])
      );
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<Result<boolean, ValidationError>> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return Result.ok(isValid);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to verify password', [
          { field: 'password', message: 'Password verification failed' },
        ])
      );
    }
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokenPair(userId: string, email: string): Result<TokenPair, ValidationError> {
    try {
      const payload: JWTPayload = {
        userId,
        email,
      };

      // Generate access token (short-lived)
      const accessToken = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRATION,
      });

      // Generate refresh token (long-lived)
      const refreshToken = jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
        expiresIn: this.REFRESH_TOKEN_EXPIRATION,
      });

      // Calculate expiration in seconds
      const expiresIn = this.getExpirationInSeconds(this.JWT_EXPIRATION);

      return Result.ok({
        accessToken,
        refreshToken,
        expiresIn,
      });
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to generate tokens', [
          { field: 'token', message: 'Token generation failed' },
        ])
      );
    }
  }

  /**
   * Verify access token and extract payload
   */
  verifyAccessToken(token: string): Result<JWTPayload, ValidationError> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return Result.ok(payload);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail(
          new ValidationError('Token expired', [{ field: 'token', message: 'Access token has expired' }])
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail(
          new ValidationError('Invalid token', [{ field: 'token', message: 'Access token is invalid' }])
        );
      }
      return Result.fail(
        new ValidationError('Token verification failed', [
          { field: 'token', message: 'Failed to verify access token' },
        ])
      );
    }
  }

  /**
   * Verify refresh token and extract payload
   */
  verifyRefreshToken(token: string): Result<JWTPayload, ValidationError> {
    try {
      const payload = jwt.verify(token, this.REFRESH_TOKEN_SECRET) as JWTPayload;
      return Result.ok(payload);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail(
          new ValidationError('Refresh token expired', [
            { field: 'refreshToken', message: 'Refresh token has expired' },
          ])
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return Result.fail(
          new ValidationError('Invalid refresh token', [
            { field: 'refreshToken', message: 'Refresh token is invalid' },
          ])
        );
      }
      return Result.fail(
        new ValidationError('Refresh token verification failed', [
          { field: 'refreshToken', message: 'Failed to verify refresh token' },
        ])
      );
    }
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): Result<void, ValidationError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long',
      });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/[0-9]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
      });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Password does not meet security requirements', errors));
    }

    return Result.ok(undefined);
  }

  /**
   * Convert expiration string to seconds
   */
  private getExpirationInSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 604800; // Default to 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 1);
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): Result<void, ValidationError> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return Result.fail(
        new ValidationError('Invalid email format', [
          { field: 'email', message: 'Please provide a valid email address' },
        ])
      );
    }

    return Result.ok(undefined);
  }
}
