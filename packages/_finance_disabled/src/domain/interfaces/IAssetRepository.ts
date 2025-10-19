import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Asset, AssetType } from '../entities';

/**
 * Asset query options
 */
export interface AssetQueryOptions {
  type?: AssetType;
  institution?: string;
  page?: number;
  limit?: number;
}

/**
 * Asset Repository Interface
 */
export interface IAssetRepository {
  /**
   * Find asset by ID
   */
  findById(id: string): Promise<Result<Asset, BaseError>>;

  /**
   * Find all assets with optional filters
   */
  findAll(options?: AssetQueryOptions): Promise<Result<Asset[], BaseError>>;

  /**
   * Find assets by type
   */
  findByType(type: AssetType): Promise<Result<Asset[], BaseError>>;

  /**
   * Find liquid assets (cash, savings, checking)
   */
  findLiquidAssets(): Promise<Result<Asset[], BaseError>>;

  /**
   * Find investment assets
   */
  findInvestmentAssets(): Promise<Result<Asset[], BaseError>>;

  /**
   * Find tangible assets (real estate, vehicles)
   */
  findTangibleAssets(): Promise<Result<Asset[], BaseError>>;

  /**
   * Create a new asset
   */
  create(asset: Asset): Promise<Result<Asset, BaseError>>;

  /**
   * Update an existing asset
   */
  update(asset: Asset): Promise<Result<Asset, BaseError>>;

  /**
   * Delete an asset
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get total asset value
   */
  getTotalValue(): Promise<Result<number, BaseError>>;

  /**
   * Get total liquid asset value
   */
  getTotalLiquidValue(): Promise<Result<number, BaseError>>;

  /**
   * Get net worth (assets - liabilities)
   */
  getNetWorth(): Promise<Result<number, BaseError>>;

  /**
   * Count assets matching criteria
   */
  count(options?: AssetQueryOptions): Promise<Result<number, BaseError>>;
}
