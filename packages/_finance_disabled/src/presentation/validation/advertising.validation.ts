/**
 * Advertising Validation Schemas
 *
 * Zod schemas for validating advertising API requests.
 *
 * @module Finance
 */

import { z } from 'zod';
import { Platform, AdType, CampaignStatus } from '../../domain/value-objects/AdvertisingEnums';

/**
 * Campaign creation validation schema
 */
export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    platform: z.nativeEnum(Platform),
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()).optional(),
    totalBudget: z.number().min(0).optional(),
    currency: z.string().length(3).default('EUR'),
    targetAudience: z.string().optional(),
    objectives: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

/**
 * Campaign update validation schema
 */
export const updateCampaignSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    platform: z.nativeEnum(Platform).optional(),
    startDate: z.string().datetime().or(z.date()).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
    totalBudget: z.number().min(0).optional(),
    targetAudience: z.string().optional(),
    objectives: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

/**
 * Campaign status update validation schema
 */
export const updateCampaignStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.nativeEnum(CampaignStatus),
  }),
});

/**
 * Advertising expense creation validation schema
 */
export const createExpenseSchema = z.object({
  body: z.object({
    campaignId: z.string().uuid(),
    date: z.string().datetime().or(z.date()),
    amount: z.number().min(0),
    currency: z.string().length(3).default('EUR'),
    platform: z.nativeEnum(Platform),
    adType: z.nativeEnum(AdType),
    description: z.string().optional(),
    impressions: z.number().int().min(0).optional(),
    clicks: z.number().int().min(0).optional(),
    conversions: z.number().int().min(0).optional(),
    revenue: z.number().min(0).optional(),
    targetAudience: z.string().optional(),
    ageRange: z.string().optional(),
    location: z.string().optional(),
    creativeUrl: z.string().url().optional(),
    landingPageUrl: z.string().url().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      if (data.impressions !== undefined && data.clicks !== undefined) {
        return data.clicks <= data.impressions;
      }
      return true;
    },
    {
      message: 'Clicks cannot exceed impressions',
      path: ['clicks'],
    }
  )
  .refine(
    (data) => {
      if (data.clicks !== undefined && data.conversions !== undefined) {
        return data.conversions <= data.clicks;
      }
      return true;
    },
    {
      message: 'Conversions cannot exceed clicks',
      path: ['conversions'],
    }
  ),
});

/**
 * Advertising expense update validation schema
 */
export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    date: z.string().datetime().or(z.date()).optional(),
    amount: z.number().min(0).optional(),
    platform: z.nativeEnum(Platform).optional(),
    adType: z.nativeEnum(AdType).optional(),
    description: z.string().optional(),
    targetAudience: z.string().optional(),
    ageRange: z.string().optional(),
    location: z.string().optional(),
    creativeUrl: z.string().url().optional(),
    landingPageUrl: z.string().url().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

/**
 * Expense metrics update validation schema
 */
export const updateExpenseMetricsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    impressions: z.number().int().min(0).optional(),
    clicks: z.number().int().min(0).optional(),
    conversions: z.number().int().min(0).optional(),
    revenue: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      return (
        data.impressions !== undefined ||
        data.clicks !== undefined ||
        data.conversions !== undefined ||
        data.revenue !== undefined
      );
    },
    {
      message: 'At least one metric must be provided',
    }
  ),
});

/**
 * Get campaign by ID validation schema
 */
export const getCampaignSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

/**
 * Get expense by ID validation schema
 */
export const getExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

/**
 * Get expenses by campaign validation schema
 */
export const getExpensesByCampaignSchema = z.object({
  params: z.object({
    campaignId: z.string().uuid(),
  }),
});

/**
 * Get campaign ROI validation schema
 */
export const getCampaignROISchema = z.object({
  params: z.object({
    campaignId: z.string().uuid(),
  }),
});

/**
 * Filter campaigns validation schema
 */
export const filterCampaignsSchema = z.object({
  query: z.object({
    platform: z.nativeEnum(Platform).optional(),
    status: z.nativeEnum(CampaignStatus).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

/**
 * Filter expenses validation schema
 */
export const filterExpensesSchema = z.object({
  query: z.object({
    platform: z.nativeEnum(Platform).optional(),
    adType: z.nativeEnum(AdType).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    profitable: z.enum(['true', 'false']).optional(),
  }),
});

/**
 * Type exports for use in controllers
 */
export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignRequest = z.infer<typeof updateCampaignSchema>;
export type UpdateCampaignStatusRequest = z.infer<typeof updateCampaignStatusSchema>;
export type CreateExpenseRequest = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseRequest = z.infer<typeof updateExpenseSchema>;
export type UpdateExpenseMetricsRequest = z.infer<typeof updateExpenseMetricsSchema>;
export type GetCampaignRequest = z.infer<typeof getCampaignSchema>;
export type GetExpenseRequest = z.infer<typeof getExpenseSchema>;
export type GetExpensesByCampaignRequest = z.infer<typeof getExpensesByCampaignSchema>;
export type GetCampaignROIRequest = z.infer<typeof getCampaignROISchema>;
export type FilterCampaignsRequest = z.infer<typeof filterCampaignsSchema>;
export type FilterExpensesRequest = z.infer<typeof filterExpensesSchema>;
