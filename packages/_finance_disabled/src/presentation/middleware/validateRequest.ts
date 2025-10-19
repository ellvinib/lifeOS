import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '@lifeOS/core/shared/errors';

/**
 * Zod Request Validation Middleware
 *
 * Validates incoming HTTP requests against Zod schemas.
 * Validates params, query, and body separately.
 *
 * Usage:
 * router.post('/invoices', validateRequest(uploadInvoiceSchema), controller.uploadInvoice);
 */
export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors for API response
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const validationError = new ValidationError('Request validation failed', validationErrors);

        // Send validation error response
        res.status(400).json({
          success: false,
          error: {
            message: validationError.message,
            code: validationError.code,
            status: validationError.statusCode,
            details: validationErrors,
          },
        });
        return;
      }

      // Unexpected error
      next(error);
    }
  };
};

/**
 * Parse tags from query string
 *
 * Handles both single tag and array of tags:
 * - ?tags=tag1 -> ['tag1']
 * - ?tags=tag1&tags=tag2 -> ['tag1', 'tag2']
 * - ?tags=tag1,tag2 -> ['tag1', 'tag2']
 */
export const parseTagsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.tags) {
    if (typeof req.query.tags === 'string') {
      // Split by comma if comma-separated
      if (req.query.tags.includes(',')) {
        req.query.tags = req.query.tags.split(',').map((t) => t.trim());
      } else {
        req.query.tags = [req.query.tags];
      }
    }
  }

  next();
};
