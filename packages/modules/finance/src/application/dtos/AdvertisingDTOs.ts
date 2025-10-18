/**
 * Advertising DTOs
 *
 * Data Transfer Objects for API responses.
 *
 * @module Finance
 */

import { AdvertisingCampaign } from '../../domain/entities/AdvertisingCampaign';
import { AdvertisingExpense } from '../../domain/entities/AdvertisingExpense';

/**
 * Campaign response DTO
 */
export interface CampaignDTO {
  id: string;
  name: string;
  description?: string;
  platform: string;
  status: string;
  startDate: string;
  endDate?: string;
  totalBudget?: number;
  currency: string;
  targetAudience?: string;
  objectives: string[];
  tags: string[];
  durationDays?: number;
  daysRemaining?: number;
  daysElapsed: number;
  isActive: boolean;
  isCompleted: boolean;
  isRunning: boolean;
  hasEnded: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Expense response DTO
 */
export interface ExpenseDTO {
  id: string;
  campaignId: string;
  date: string;
  amount: number;
  currency: string;
  platform: string;
  adType: string;
  description?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  likes: number;
  shares: number;
  comments: number;
  videoViews: number;
  targetAudience?: string;
  ageRange?: string;
  location?: string;
  creativeUrl?: string;
  landingPageUrl?: string;
  notes?: string;
  tags: string[];
  roiMetrics: {
    roi: number;
    roas: number;
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpm: number;
    cpa: number;
    profit: number;
    profitMargin: number;
    isProfitable: boolean;
    performanceGrade: string;
  };
  isProfitable: boolean;
  hasMetrics: boolean;
  hasEngagement: boolean;
  totalEngagement: number;
  engagementRate: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campaign DTO Mapper
 */
export class CampaignDTOMapper {
  /**
   * Convert domain entity to DTO
   */
  static toDTO(campaign: AdvertisingCampaign): CampaignDTO {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      platform: campaign.platform,
      status: campaign.status,
      startDate: campaign.startDate.toISOString(),
      endDate: campaign.endDate?.toISOString(),
      totalBudget: campaign.totalBudget,
      currency: campaign.currency,
      targetAudience: campaign.targetAudience,
      objectives: campaign.objectives,
      tags: campaign.tags,
      durationDays: campaign.durationDays ?? undefined,
      daysRemaining: campaign.daysRemaining ?? undefined,
      daysElapsed: campaign.daysElapsed,
      isActive: campaign.isActive,
      isCompleted: campaign.isCompleted,
      isRunning: campaign.isRunning,
      hasEnded: campaign.hasEnded,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }

  /**
   * Convert array of domain entities to DTOs
   */
  static toDTOArray(campaigns: AdvertisingCampaign[]): CampaignDTO[] {
    return campaigns.map((campaign) => this.toDTO(campaign));
  }
}

/**
 * Expense DTO Mapper
 */
export class ExpenseDTOMapper {
  /**
   * Convert domain entity to DTO
   */
  static toDTO(expense: AdvertisingExpense): ExpenseDTO {
    const roiMetrics = expense.roiMetrics.toJSON();

    return {
      id: expense.id,
      campaignId: expense.campaignId,
      date: expense.date.toISOString(),
      amount: expense.amount,
      currency: expense.currency,
      platform: expense.platform,
      adType: expense.adType,
      description: expense.description,
      impressions: expense.impressions,
      clicks: expense.clicks,
      conversions: expense.conversions,
      revenue: expense.revenue,
      likes: expense.likes,
      shares: expense.shares,
      comments: expense.comments,
      videoViews: expense.videoViews,
      targetAudience: expense.targetAudience,
      ageRange: expense.ageRange,
      location: expense.location,
      creativeUrl: expense.creativeUrl,
      landingPageUrl: expense.landingPageUrl,
      notes: expense.notes,
      tags: expense.tags,
      roiMetrics: {
        roi: roiMetrics.roi,
        roas: roiMetrics.roas,
        ctr: roiMetrics.ctr,
        conversionRate: roiMetrics.conversionRate,
        cpc: roiMetrics.cpc,
        cpm: roiMetrics.cpm,
        cpa: roiMetrics.cpa,
        profit: roiMetrics.profit,
        profitMargin: roiMetrics.profitMargin,
        isProfitable: roiMetrics.isProfitable,
        performanceGrade: roiMetrics.performanceGrade,
      },
      isProfitable: expense.isProfitable,
      hasMetrics: expense.hasMetrics,
      hasEngagement: expense.hasEngagement,
      totalEngagement: expense.totalEngagement,
      engagementRate: expense.engagementRate,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  /**
   * Convert array of domain entities to DTOs
   */
  static toDTOArray(expenses: AdvertisingExpense[]): ExpenseDTO[] {
    return expenses.map((expense) => this.toDTO(expense));
  }
}
