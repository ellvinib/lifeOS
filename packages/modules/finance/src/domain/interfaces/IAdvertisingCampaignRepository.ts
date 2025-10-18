/**
 * AdvertisingCampaign Repository Interface
 *
 * Pure interface with no implementation details.
 * Follows dependency inversion principle.
 *
 * Design Principles:
 * - Returns domain entities, not database models
 * - All methods return Result<T, E> for explicit error handling
 * - No leaky abstractions (no SQL, ORM details)
 * - Transaction support built-in
 *
 * @module Finance
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { AdvertisingCampaign } from '../entities/AdvertisingCampaign';
import { Platform, CampaignStatus } from '../value-objects/AdvertisingEnums';

/**
 * Repository interface for AdvertisingCampaign aggregate
 */
export interface IAdvertisingCampaignRepository {
  /**
   * Find campaign by ID
   *
   * @param id - Campaign ID
   * @returns Result with campaign or error
   */
  findById(id: string): Promise<Result<AdvertisingCampaign, BaseError>>;

  /**
   * Find all campaigns
   *
   * @returns Result with array of campaigns or error
   */
  findAll(): Promise<Result<AdvertisingCampaign[], BaseError>>;

  /**
   * Find campaigns by platform
   *
   * @param platform - Platform to filter by
   * @returns Result with array of campaigns or error
   */
  findByPlatform(platform: Platform): Promise<Result<AdvertisingCampaign[], BaseError>>;

  /**
   * Find campaigns by status
   *
   * @param status - Status to filter by
   * @returns Result with array of campaigns or error
   */
  findByStatus(status: CampaignStatus): Promise<Result<AdvertisingCampaign[], BaseError>>;

  /**
   * Find active campaigns
   *
   * @returns Result with array of active campaigns or error
   */
  findActiveCampaigns(): Promise<Result<AdvertisingCampaign[], BaseError>>;

  /**
   * Find campaigns within date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Result with array of campaigns or error
   */
  findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<AdvertisingCampaign[], BaseError>>;

  /**
   * Create a new campaign
   *
   * @param campaign - Campaign to create
   * @returns Result with created campaign or error
   */
  create(campaign: AdvertisingCampaign): Promise<Result<AdvertisingCampaign, BaseError>>;

  /**
   * Update an existing campaign
   *
   * @param campaign - Campaign to update
   * @returns Result with updated campaign or error
   */
  update(campaign: AdvertisingCampaign): Promise<Result<AdvertisingCampaign, BaseError>>;

  /**
   * Delete a campaign
   *
   * @param id - Campaign ID to delete
   * @returns Result with void or error
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if campaign exists
   *
   * @param id - Campaign ID
   * @returns Result with boolean or error
   */
  exists(id: string): Promise<Result<boolean, BaseError>>;

  /**
   * Count total campaigns
   *
   * @returns Result with count or error
   */
  count(): Promise<Result<number, BaseError>>;

  /**
   * Count campaigns by status
   *
   * @param status - Status to count
   * @returns Result with count or error
   */
  countByStatus(status: CampaignStatus): Promise<Result<number, BaseError>>;
}
