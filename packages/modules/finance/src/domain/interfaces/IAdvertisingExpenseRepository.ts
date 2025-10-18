/**
 * AdvertisingExpense Repository Interface
 *
 * Pure interface with no implementation details.
 * Follows dependency inversion principle.
 *
 * Design Principles:
 * - Returns domain entities, not database models
 * - All methods return Result<T, E> for explicit error handling
 * - No leaky abstractions (no SQL, ORM details)
 * - Rich query methods for analytics
 *
 * @module Finance
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { AdvertisingExpense } from '../entities/AdvertisingExpense';
import { Platform, AdType } from '../value-objects/AdvertisingEnums';

/**
 * Repository interface for AdvertisingExpense entity
 */
export interface IAdvertisingExpenseRepository {
  /**
   * Find expense by ID
   *
   * @param id - Expense ID
   * @returns Result with expense or error
   */
  findById(id: string): Promise<Result<AdvertisingExpense, BaseError>>;

  /**
   * Find all expenses
   *
   * @returns Result with array of expenses or error
   */
  findAll(): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find expenses by campaign ID
   *
   * @param campaignId - Campaign ID to filter by
   * @returns Result with array of expenses or error
   */
  findByCampaignId(campaignId: string): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find expenses by platform
   *
   * @param platform - Platform to filter by
   * @returns Result with array of expenses or error
   */
  findByPlatform(platform: Platform): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find expenses by ad type
   *
   * @param adType - Ad type to filter by
   * @returns Result with array of expenses or error
   */
  findByAdType(adType: AdType): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find expenses within date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Result with array of expenses or error
   */
  findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find expenses by campaign and date range
   *
   * @param campaignId - Campaign ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Result with array of expenses or error
   */
  findByCampaignAndDateRange(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find top performing expenses by ROI
   *
   * @param limit - Maximum number of results
   * @returns Result with array of expenses or error
   */
  findTopPerformingByROI(limit: number): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Find profitable expenses
   *
   * @returns Result with array of expenses or error
   */
  findProfitable(): Promise<Result<AdvertisingExpense[], BaseError>>;

  /**
   * Create a new expense
   *
   * @param expense - Expense to create
   * @returns Result with created expense or error
   */
  create(expense: AdvertisingExpense): Promise<Result<AdvertisingExpense, BaseError>>;

  /**
   * Update an existing expense
   *
   * @param expense - Expense to update
   * @returns Result with updated expense or error
   */
  update(expense: AdvertisingExpense): Promise<Result<AdvertisingExpense, BaseError>>;

  /**
   * Delete an expense
   *
   * @param id - Expense ID to delete
   * @returns Result with void or error
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Delete all expenses for a campaign
   *
   * @param campaignId - Campaign ID
   * @returns Result with void or error
   */
  deleteByCampaignId(campaignId: string): Promise<Result<void, BaseError>>;

  /**
   * Check if expense exists
   *
   * @param id - Expense ID
   * @returns Result with boolean or error
   */
  exists(id: string): Promise<Result<boolean, BaseError>>;

  /**
   * Count total expenses
   *
   * @returns Result with count or error
   */
  count(): Promise<Result<number, BaseError>>;

  /**
   * Count expenses for a campaign
   *
   * @param campaignId - Campaign ID
   * @returns Result with count or error
   */
  countByCampaignId(campaignId: string): Promise<Result<number, BaseError>>;

  /**
   * Get total spend for a campaign
   *
   * @param campaignId - Campaign ID
   * @returns Result with total spend or error
   */
  getTotalSpendByCampaignId(campaignId: string): Promise<Result<number, BaseError>>;

  /**
   * Get total revenue for a campaign
   *
   * @param campaignId - Campaign ID
   * @returns Result with total revenue or error
   */
  getTotalRevenueByCampaignId(campaignId: string): Promise<Result<number, BaseError>>;

  /**
   * Get aggregated metrics for a campaign
   *
   * @param campaignId - Campaign ID
   * @returns Result with aggregated metrics or error
   */
  getAggregatedMetricsByCampaignId(campaignId: string): Promise<
    Result<
      {
        totalSpend: number;
        totalRevenue: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
      },
      BaseError
    >
  >;
}
