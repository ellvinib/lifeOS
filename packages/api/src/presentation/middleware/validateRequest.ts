import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@lifeos/core';

/**
 * Validation middleware using Zod schemas.
 *
 * Design principles:
 * - Generic: Works with any Zod schema
 * - Reusable: Can be used on any route
 * - Type-safe: Validates and infers types
 * - Single Responsibility: Only validates, doesn't handle errors
 *
 * Usage:
 * ```typescript
 * router.post('/tasks',
 *   validateRequest(CreateTaskSchema),
 *   taskController.createTask
 * );
 * ```
 */

/**
 * Validate request using Zod schema.
 * Validates params, query, and body.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request (params, query, body)
      const validatedData = await schema.parseAsync({
        params: req.params,
        query: req.query,
        body: req.body,
      });

      // Replace request data with validated (and transformed) data
      req.params = validatedData.params ?? req.params;
      req.query = validatedData.query ?? req.query;
      req.body = validatedData.body ?? req.body;

      // Continue to next middleware
      next();
    } catch (error) {
      // Convert Zod errors to ValidationError
      if (isZodError(error)) {
        const validationError = zodErrorToValidationError(error);
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Type guard for Zod errors.
 */
function isZodError(error: unknown): error is ZodError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as Record<string, unknown>).issues)
  );
}

/**
 * Convert Zod error to our ValidationError format.
 * Maps Zod issues to validation error details.
 */
function zodErrorToValidationError(zodError: ZodError): ValidationError {
  const errors = zodError.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    value: issue.code === 'invalid_type' ? undefined : issue,
  }));

  return new ValidationError('Request validation failed', errors);
}
