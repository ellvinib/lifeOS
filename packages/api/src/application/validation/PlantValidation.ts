/**
 * Plant Validation Schemas
 *
 * Zod schemas for validating Plant API requests.
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
 * Plant type enum.
 */
const PlantTypeSchema = z.enum([
  'tree',
  'shrub',
  'perennial',
  'annual',
  'vegetable',
  'herb',
  'grass',
  'bulb',
]);

/**
 * Growth stage enum.
 */
const GrowthStageSchema = z.enum([
  'seed',
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'mature',
  'dormant',
]);

/**
 * Sun exposure enum.
 */
const SunExposureSchema = z.enum(['full_sun', 'partial_sun', 'partial_shade', 'full_shade']);

/**
 * Watering frequency enum.
 */
const WateringFrequencySchema = z.enum([
  'daily',
  'every_other_day',
  'twice_weekly',
  'weekly',
  'bi_weekly',
  'monthly',
  'seasonal',
]);

/**
 * Create plant schema.
 */
export const CreatePlantSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(200, 'Name must not exceed 200 characters')
      .trim(),
    scientificName: z.string().max(200, 'Scientific name must not exceed 200 characters').optional(),
    type: PlantTypeSchema,
    variety: z.string().max(100, 'Variety must not exceed 100 characters').optional(),
    location: z
      .string()
      .min(2, 'Location must be at least 2 characters')
      .max(200, 'Location must not exceed 200 characters')
      .trim(),
    areaId: uuidSchema.optional(),
    plantedDate: isoDateSchema.optional(),
    growthStage: GrowthStageSchema.default('seed'),
    sunExposure: SunExposureSchema,
    wateringFrequency: WateringFrequencySchema,
    expectedHarvestDate: isoDateSchema.optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Update plant schema.
 */
export const UpdatePlantSchema = z.object({
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
    scientificName: z.string().max(200, 'Scientific name must not exceed 200 characters').optional(),
    type: PlantTypeSchema.optional(),
    variety: z.string().max(100, 'Variety must not exceed 100 characters').optional(),
    location: z
      .string()
      .min(2, 'Location must be at least 2 characters')
      .max(200, 'Location must not exceed 200 characters')
      .trim()
      .optional(),
    areaId: uuidSchema.nullable().optional(),
    growthStage: GrowthStageSchema.optional(),
    sunExposure: SunExposureSchema.optional(),
    wateringFrequency: WateringFrequencySchema.optional(),
    expectedHarvestDate: isoDateSchema.nullable().optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Get plant by ID schema.
 */
export const GetPlantByIdSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * Get plants query schema.
 */
export const GetPlantsQuerySchema = z.object({
  query: z.object({
    name: z.string().optional(),
    type: PlantTypeSchema.optional(),
    areaId: uuidSchema.optional(),
    growthStage: GrowthStageSchema.optional(),
    wateringFrequency: WateringFrequencySchema.optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    needsWatering: z
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
    sortBy: z.enum(['name', 'plantedDate', 'lastWatered', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Delete plant schema.
 */
export const DeletePlantSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * Record watering schema.
 */
export const RecordWateringSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    wateredDate: isoDateSchema.optional(),
  }),
});

/**
 * Record fertilizing schema.
 */
export const RecordFertilizingSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    fertilizedDate: isoDateSchema.optional(),
  }),
});

/**
 * Record pruning schema.
 */
export const RecordPruningSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    prunedDate: isoDateSchema.optional(),
  }),
});

/**
 * Record harvest schema.
 */
export const RecordHarvestSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    harvestDate: isoDateSchema.optional(),
  }),
});
