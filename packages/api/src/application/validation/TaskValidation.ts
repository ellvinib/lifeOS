import { z } from 'zod';

/**
 * Validation schemas for Task endpoints using Zod.
 *
 * Benefits of Zod:
 * - Type-safe (inferred TypeScript types)
 * - Runtime validation
 * - Composable schemas
 * - Clear error messages
 *
 * Design principles:
 * - One schema per DTO
 * - Reusable sub-schemas
 * - Business rules encoded in validation
 */

/**
 * Recurrence pattern validation schema.
 */
const RecurrenceSchema = z.object({
  type: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom']),
  interval: z.number().int().positive(),
  endDate: z.string().datetime().optional().nullable(),
  customRule: z.string().optional().nullable(),
  daysOfWeek: z.array(
    z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  ).optional().nullable(),
});

/**
 * Create task request validation schema.
 */
export const CreateTaskSchema = z.object({
  body: z.object({
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),

    description: z.string()
      .max(2000, 'Description must not exceed 2000 characters')
      .optional()
      .default(''),

    type: z.string()
      .min(1, 'Type is required')
      .max(50, 'Type must not exceed 50 characters'),

    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'])
      .optional()
      .default('pending'),

    priority: z.enum(['low', 'medium', 'high', 'urgent'])
      .optional()
      .default('medium'),

    dueDate: z.string()
      .datetime()
      .refine((date) => new Date(date) > new Date(), {
        message: 'Due date must be in the future',
      })
      .optional(),

    recurrence: RecurrenceSchema.optional(),

    moduleSource: z.string()
      .min(1, 'Module source is required')
      .max(50, 'Module source must not exceed 50 characters'),

    metadata: z.record(z.unknown())
      .optional()
      .default({}),

    tags: z.array(z.string().max(30))
      .max(20, 'Maximum 20 tags allowed')
      .optional()
      .default([]),
  }),
});

/**
 * Update task request validation schema.
 * All fields are optional (partial update).
 */
export const UpdateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim()
      .optional(),

    description: z.string()
      .max(2000, 'Description must not exceed 2000 characters')
      .optional(),

    type: z.string()
      .min(1, 'Type is required')
      .max(50, 'Type must not exceed 50 characters')
      .optional(),

    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'])
      .optional(),

    priority: z.enum(['low', 'medium', 'high', 'urgent'])
      .optional(),

    dueDate: z.string()
      .datetime()
      .nullable()
      .optional(),

    recurrence: RecurrenceSchema.nullable().optional(),

    metadata: z.record(z.unknown()).optional(),

    tags: z.array(z.string().max(30))
      .max(20, 'Maximum 20 tags allowed')
      .optional(),
  }),
});

/**
 * Get task by ID validation schema.
 */
export const GetTaskByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * Get tasks query validation schema.
 */
export const GetTasksQuerySchema = z.object({
  query: z.object({
    moduleSource: z.string().optional(),

    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),

    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),

    tags: z.string()
      .transform((val) => val.split(',').map(t => t.trim()))
      .optional(),

    dueDateFrom: z.string().datetime().optional(),

    dueDateTo: z.string().datetime().optional(),

    overdue: z.string()
      .transform((val) => val === 'true')
      .optional(),

    limit: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, {
        message: 'Limit must be between 1 and 100',
      })
      .optional()
      .default('50'),

    offset: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 0, {
        message: 'Offset must be non-negative',
      })
      .optional()
      .default('0'),

    orderBy: z.enum(['dueDate', 'priority', 'createdAt', 'updatedAt'])
      .optional()
      .default('createdAt'),

    orderDirection: z.enum(['asc', 'desc'])
      .optional()
      .default('desc'),
  }),
});

/**
 * Delete task validation schema.
 */
export const DeleteTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * Type inference from Zod schemas.
 * These types can be used in controllers for type safety.
 */
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type GetTaskByIdInput = z.infer<typeof GetTaskByIdSchema>;
export type GetTasksQueryInput = z.infer<typeof GetTasksQuerySchema>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskSchema>;
