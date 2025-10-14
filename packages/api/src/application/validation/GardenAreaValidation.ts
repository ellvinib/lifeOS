/**
 * GardenArea Validation Schemas
 *
 * Zod schemas for validating GardenArea API requests.
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
 * Garden area type enum.
 */
const GardenAreaTypeSchema = z.enum([
  'lawn',
  'flower_bed',
  'vegetable_patch',
  'herb_garden',
  'hedge',
  'tree_area',
  'patio',
  'pathway',
  'pond',
  'greenhouse',
  'compost',
  'other',
]);

/**
 * Create garden area schema.
 */
export const CreateGardenAreaSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(200, 'Name must not exceed 200 characters')
      .trim(),
    type: GardenAreaTypeSchema,
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
    sizeSquareMeters: z.number().min(0).optional(),
    location: z
      .string()
      .min(2, 'Location must be at least 2 characters')
      .max(200, 'Location must not exceed 200 characters')
      .trim(),
    soilType: z.string().max(100, 'Soil type must not exceed 100 characters').optional(),
    sunExposureHours: z.number().min(0).max(24, 'Sun exposure must be between 0 and 24 hours').optional(),
    irrigationSystem: z.string().max(100, 'Irrigation system must not exceed 100 characters').optional(),
    maintenanceFrequencyDays: z.number().int().min(1, 'Maintenance frequency must be at least 1 day').optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Update garden area schema.
 */
export const UpdateGardenAreaSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(200, 'Name must not exceed 200 characters')
      .trim()
      .optional(),
    type: GardenAreaTypeSchema.optional(),
    description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
    sizeSquareMeters: z.number().min(0).optional(),
    location: z
      .string()
      .min(2, 'Location must be at least 2 characters')
      .max(200, 'Location must not exceed 200 characters')
      .trim()
      .optional(),
    soilType: z.string().max(100, 'Soil type must not exceed 100 characters').optional(),
    sunExposureHours: z.number().min(0).max(24, 'Sun exposure must be between 0 and 24 hours').optional(),
    irrigationSystem: z.string().max(100, 'Irrigation system must not exceed 100 characters').optional(),
    maintenanceFrequencyDays: z.number().int().min(1, 'Maintenance frequency must be at least 1 day').optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Get garden area by ID schema.
 */
export const GetGardenAreaByIdSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * Get garden areas query schema.
 */
export const GetGardenAreasQuerySchema = z.object({
  query: z.object({
    name: z.string().optional(),
    type: GardenAreaTypeSchema.optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    needsMaintenance: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
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
    sortBy: z.enum(['name', 'type', 'lastMaintained', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Delete garden area schema.
 */
export const DeleteGardenAreaSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * Record maintenance schema.
 */
export const RecordMaintenanceSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    maintenedDate: isoDateSchema.optional(),
  }),
});
