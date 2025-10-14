/**
 * GardenTask Validation Schemas
 *
 * Zod schemas for validating GardenTask API requests.
 *
 * Design principles:
 * - Type-safe: Auto-generates TypeScript types
 * - Declarative: Clear validation rules
 * - Composable: Reuse schemas where possible
 * - User-friendly: Clear error messages
 */

import { z } from 'zod';

/**
 * UUID validation helper.
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ISO 8601 date validation helper.
 */
const isoDateSchema = z.string().datetime('Invalid ISO 8601 date format');

/**
 * Garden task type enum.
 */
const GardenTaskTypeSchema = z.enum([
  'mowing',
  'watering',
  'fertilizing',
  'pruning',
  'weeding',
  'planting',
  'harvesting',
  'pest_control',
  'mulching',
  'hedge_trimming',
  'leaf_removal',
  'winterizing',
  'composting',
  'soil_preparation',
  'other',
]);

/**
 * Task status enum.
 */
const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

/**
 * Task priority enum.
 */
const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

/**
 * Weather dependency enum.
 */
const WeatherDependencySchema = z.enum([
  'none',
  'dry_weather',
  'wet_weather',
  'mild_temperature',
  'no_frost',
]);

/**
 * Season enum.
 */
const SeasonSchema = z.enum(['spring', 'summer', 'fall', 'winter']);

/**
 * Create garden task schema.
 */
export const CreateGardenTaskSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
    type: GardenTaskTypeSchema,
    priority: TaskPrioritySchema.default('medium'),
    areaId: uuidSchema.optional(),
    plantIds: z.array(uuidSchema).optional(),
    estimatedDurationMinutes: z.number().int().min(1).optional(),
    weatherDependency: WeatherDependencySchema.default('none'),
    idealSeasons: z.array(SeasonSchema).optional(),
    dueDate: isoDateSchema.optional(),
    scheduledDate: isoDateSchema.optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    tools: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    cost: z.number().min(0).optional(),
    isRecurring: z.boolean().default(false),
    recurrenceIntervalDays: z.number().int().min(1).optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Update garden task schema.
 */
export const UpdateGardenTaskSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim()
      .optional(),
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
    type: GardenTaskTypeSchema.optional(),
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    areaId: uuidSchema.nullable().optional(),
    plantIds: z.array(uuidSchema).optional(),
    estimatedDurationMinutes: z.number().int().min(1).optional(),
    weatherDependency: WeatherDependencySchema.optional(),
    idealSeasons: z.array(SeasonSchema).optional(),
    dueDate: isoDateSchema.nullable().optional(),
    scheduledDate: isoDateSchema.nullable().optional(),
    completedDate: isoDateSchema.nullable().optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    tools: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    cost: z.number().min(0).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceIntervalDays: z.number().int().min(1).optional(),
    nextRecurrenceDate: isoDateSchema.nullable().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Get garden task by ID schema.
 */
export const GetGardenTaskByIdSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * Get garden tasks query schema.
 */
export const GetGardenTasksQuerySchema = z.object({
  query: z.object({
    title: z.string().optional(),
    type: GardenTaskTypeSchema.optional(),
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    areaId: uuidSchema.optional(),
    plantId: uuidSchema.optional(),
    weatherDependency: WeatherDependencySchema.optional(),
    idealSeason: SeasonSchema.optional(),
    isRecurring: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    isOverdue: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    tags: z.string().transform((val) => val.split(',')).optional(),
    dueDateFrom: isoDateSchema.optional(),
    dueDateTo: isoDateSchema.optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100))
      .optional(),
    offset: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(0))
      .optional(),
    sortBy: z.enum(['title', 'dueDate', 'priority', 'createdAt', 'scheduledDate']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Delete garden task schema.
 */
export const DeleteGardenTaskSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * Complete garden task schema.
 */
export const CompleteGardenTaskSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    completedDate: isoDateSchema.optional(),
  }),
});
