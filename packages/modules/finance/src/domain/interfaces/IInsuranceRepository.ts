import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Insurance, InsuranceType, InsuranceStatus } from '../entities';

/**
 * Insurance query options
 */
export interface InsuranceQueryOptions {
  type?: InsuranceType;
  status?: InsuranceStatus;
  provider?: string;
  page?: number;
  limit?: number;
}

/**
 * Insurance Repository Interface
 */
export interface IInsuranceRepository {
  /**
   * Find insurance by ID
   */
  findById(id: string): Promise<Result<Insurance, BaseError>>;

  /**
   * Find all insurance policies with optional filters
   */
  findAll(options?: InsuranceQueryOptions): Promise<Result<Insurance[], BaseError>>;

  /**
   * Find insurance by type
   */
  findByType(type: InsuranceType): Promise<Result<Insurance[], BaseError>>;

  /**
   * Find insurance by status
   */
  findByStatus(status: InsuranceStatus): Promise<Result<Insurance[], BaseError>>;

  /**
   * Find active insurance policies
   */
  findActive(): Promise<Result<Insurance[], BaseError>>;

  /**
   * Find policies due for renewal
   */
  findDueForRenewal(daysAhead?: number): Promise<Result<Insurance[], BaseError>>;

  /**
   * Find expired policies
   */
  findExpired(): Promise<Result<Insurance[], BaseError>>;

  /**
   * Create a new insurance policy
   */
  create(insurance: Insurance): Promise<Result<Insurance, BaseError>>;

  /**
   * Update an existing insurance policy
   */
  update(insurance: Insurance): Promise<Result<Insurance, BaseError>>;

  /**
   * Delete an insurance policy
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get total monthly premium cost
   */
  getTotalMonthlyPremium(): Promise<Result<number, BaseError>>;

  /**
   * Get total annual premium cost
   */
  getTotalAnnualPremium(): Promise<Result<number, BaseError>>;

  /**
   * Count policies matching criteria
   */
  count(options?: InsuranceQueryOptions): Promise<Result<number, BaseError>>;
}
