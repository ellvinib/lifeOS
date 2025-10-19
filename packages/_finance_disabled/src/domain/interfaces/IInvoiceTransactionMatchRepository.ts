import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { InvoiceTransactionMatch } from '../entities';
import { MatchConfidence } from '../value-objects/InvoiceEnums';

/**
 * Match query options
 */
export interface MatchQueryOptions {
  invoiceId?: string;
  transactionId?: string;
  matchConfidence?: MatchConfidence;
  matchedBy?: 'system' | 'user';
  matchedByUserId?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'matchedAt' | 'matchScore';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Match suggestion for UI
 */
export interface MatchSuggestion {
  invoice: {
    id: string;
    invoiceNumber?: string;
    vendorName?: string;
    total: number;
    dueDate?: Date;
  };
  transaction: {
    id: string;
    amount: number;
    date: Date;
    description: string;
    counterparty?: string;
  };
  matchScore: number;
  matchConfidence: MatchConfidence;
}

/**
 * InvoiceTransactionMatch Repository Interface
 */
export interface IInvoiceTransactionMatchRepository {
  /**
   * Find match by ID
   */
  findById(id: string): Promise<Result<InvoiceTransactionMatch, BaseError>>;

  /**
   * Find all matches with optional filters
   */
  findAll(options?: MatchQueryOptions): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find matches by invoice ID
   */
  findByInvoiceId(invoiceId: string): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find matches by transaction ID
   */
  findByTransactionId(transactionId: string): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find match by invoice and transaction (unique check)
   */
  findByInvoiceAndTransaction(
    invoiceId: string,
    transactionId: string
  ): Promise<Result<InvoiceTransactionMatch, BaseError>>;

  /**
   * Find matches by confidence level
   */
  findByConfidence(confidence: MatchConfidence): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find auto-matches (system generated)
   */
  findAutoMatches(): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find manual matches (user created)
   */
  findManualMatches(): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find matches needing review (medium/low confidence)
   */
  findNeedingReview(): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find matches by user
   */
  findByUser(userId: string): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Find high confidence matches
   */
  findHighConfidence(): Promise<Result<InvoiceTransactionMatch[], BaseError>>;

  /**
   * Create a new match
   */
  create(match: InvoiceTransactionMatch): Promise<Result<InvoiceTransactionMatch, BaseError>>;

  /**
   * Update an existing match
   */
  update(match: InvoiceTransactionMatch): Promise<Result<InvoiceTransactionMatch, BaseError>>;

  /**
   * Delete a match (unmatch)
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Delete matches by invoice ID (when invoice deleted)
   */
  deleteByInvoiceId(invoiceId: string): Promise<Result<void, BaseError>>;

  /**
   * Delete matches by transaction ID (when transaction deleted)
   */
  deleteByTransactionId(transactionId: string): Promise<Result<void, BaseError>>;

  /**
   * Check if invoice is matched
   */
  isInvoiceMatched(invoiceId: string): Promise<Result<boolean, BaseError>>;

  /**
   * Check if transaction is matched
   */
  isTransactionMatched(transactionId: string): Promise<Result<boolean, BaseError>>;

  /**
   * Check if match exists (prevent duplicates)
   */
  exists(invoiceId: string, transactionId: string): Promise<Result<boolean, BaseError>>;

  /**
   * Get match count by confidence level
   */
  getCountByConfidence(confidence: MatchConfidence): Promise<Result<number, BaseError>>;

  /**
   * Get match statistics
   */
  getStatistics(): Promise<Result<{
    totalMatches: number;
    autoMatches: number;
    manualMatches: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    needingReview: number;
  }, BaseError>>;

  /**
   * Count matches matching criteria
   */
  count(options?: MatchQueryOptions): Promise<Result<number, BaseError>>;
}
