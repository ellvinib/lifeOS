import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { TransactionClassification, FeedbackType } from '../entities/TransactionClassification';
import { ExpenseCategory } from '../entities/Expense';

/**
 * Transaction Classification Query Options
 */
export interface TransactionClassificationQueryOptions {
  userId?: string;
  transactionId?: string;
  actualCategory?: ExpenseCategory;
  feedbackType?: FeedbackType;
  minConfidence?: number;
  highValueOnly?: boolean;  // Filter for high-value training data
  page?: number;
  limit?: number;
}

/**
 * Transaction Classification Repository Interface
 *
 * Defines the contract for transaction classification data access.
 * This repository manages ML training data derived from user feedback.
 */
export interface ITransactionClassificationRepository {
  /**
   * Find classification by ID
   */
  findById(id: string): Promise<Result<TransactionClassification, BaseError>>;

  /**
   * Find all classifications for a user
   */
  findByUserId(userId: string, limit?: number): Promise<Result<TransactionClassification[], BaseError>>;

  /**
   * Find classifications for a specific transaction
   */
  findByTransactionId(transactionId: string): Promise<Result<TransactionClassification[], BaseError>>;

  /**
   * Find classifications by feedback type
   */
  findByFeedbackType(userId: string, feedbackType: FeedbackType): Promise<Result<TransactionClassification[], BaseError>>;

  /**
   * Find high-value training data
   * (High confidence mistakes or low confidence successes)
   */
  findHighValueTrainingData(userId: string, limit?: number): Promise<Result<TransactionClassification[], BaseError>>;

  /**
   * Find all classifications with optional filters
   */
  findAll(options?: TransactionClassificationQueryOptions): Promise<Result<TransactionClassification[], BaseError>>;

  /**
   * Create a new classification
   */
  create(classification: TransactionClassification): Promise<Result<TransactionClassification, BaseError>>;

  /**
   * Delete a classification
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get categorization accuracy stats
   */
  getAccuracyStats(userId: string): Promise<Result<{
    total: number;
    confirmed: number;
    corrected: number;
    rejected: number;
    accuracyRate: number;
  }, BaseError>>;

  /**
   * Count classifications matching criteria
   */
  count(options?: TransactionClassificationQueryOptions): Promise<Result<number, BaseError>>;
}
