/**
 * GetCampaignROI Use Case
 *
 * Gets aggregated ROI metrics for a campaign.
 *
 * @module Finance
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, NotFoundError } from '@lifeos/core/shared/errors';
import { IAdvertisingCampaignRepository } from '../../domain/interfaces/IAdvertisingCampaignRepository';
import { IAdvertisingExpenseRepository } from '../../domain/interfaces/IAdvertisingExpenseRepository';
import { ROIMetrics } from '../../domain/value-objects/ROIMetrics';

/**
 * Campaign ROI response
 */
export interface CampaignROIResponse {
  campaignId: string;
  campaignName: string;
  metrics: {
    totalSpend: number;
    totalRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
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
  expenseCount: number;
}

/**
 * GetCampaignROI use case
 */
export class GetCampaignROIUseCase {
  constructor(
    private readonly campaignRepository: IAdvertisingCampaignRepository,
    private readonly expenseRepository: IAdvertisingExpenseRepository
  ) {}

  /**
   * Execute the use case
   *
   * @param campaignId - Campaign ID
   * @returns Result with campaign ROI data or error
   */
  async execute(campaignId: string): Promise<Result<CampaignROIResponse, BaseError>> {
    // Validate campaign exists
    const campaignResult = await this.campaignRepository.findById(campaignId);
    if (campaignResult.isFail()) {
      return Result.fail(new NotFoundError('Campaign', campaignId));
    }
    const campaign = campaignResult.value;

    // Get aggregated metrics from repository
    const metricsResult = await this.expenseRepository.getAggregatedMetricsByCampaignId(
      campaignId
    );
    if (metricsResult.isFail()) {
      return metricsResult;
    }
    const aggregated = metricsResult.value;

    // Get expense count
    const countResult = await this.expenseRepository.countByCampaignId(campaignId);
    if (countResult.isFail()) {
      return countResult;
    }
    const expenseCount = countResult.value;

    // Calculate ROI metrics using value object
    const roiMetrics = new ROIMetrics({
      spend: aggregated.totalSpend,
      revenue: aggregated.totalRevenue,
      impressions: aggregated.totalImpressions,
      clicks: aggregated.totalClicks,
      conversions: aggregated.totalConversions,
    });

    // Build response
    const response: CampaignROIResponse = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      metrics: {
        totalSpend: aggregated.totalSpend,
        totalRevenue: aggregated.totalRevenue,
        totalImpressions: aggregated.totalImpressions,
        totalClicks: aggregated.totalClicks,
        totalConversions: aggregated.totalConversions,
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
      expenseCount,
    };

    return Result.ok(response);
  }
}
