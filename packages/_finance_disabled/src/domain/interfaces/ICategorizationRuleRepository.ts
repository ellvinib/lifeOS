import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { CategorizationRule, PatternType, RuleSource } from '../entities/CategorizationRule';
import { ExpenseCategory } from '../entities/Expense';

/**
 * Categorization Rule Query Options
 */
export interface CategorizationRuleQueryOptions {
  userId?: string;
  category?: ExpenseCategory;
  patternType?: PatternType;
  source?: RuleSource;
  isActive?: boolean;
  minPriority?: number;
  page?: number;
  limit?: number;
}

/**
 * Categorization Rule Repository Interface
 *
 * Defines the contract for categorization rule data access.
 */
export interface ICategorizationRuleRepository {
  /**
   * Find rule by ID
   */
  findById(id: string): Promise<Result<CategorizationRule, BaseError>>;

  /**
   * Find all rules for a user (sorted by priority desc)
   */
  findByUserId(userId: string): Promise<Result<CategorizationRule[], BaseError>>;

  /**
   * Find active rules for a user (sorted by priority desc)
   */
  findActiveByUserId(userId: string): Promise<Result<CategorizationRule[], BaseError>>;

  /**
   * Find rules by category
   */
  findByCategory(userId: string, category: ExpenseCategory): Promise<Result<CategorizationRule[], BaseError>>;

  /**
   * Find rules by source
   */
  findBySource(userId: string, source: RuleSource): Promise<Result<CategorizationRule[], BaseError>>;

  /**
   * Find all rules with optional filters
   */
  findAll(options?: CategorizationRuleQueryOptions): Promise<Result<CategorizationRule[], BaseError>>;

  /**
   * Create a new rule
   */
  create(rule: CategorizationRule): Promise<Result<CategorizationRule, BaseError>>;

  /**
   * Update an existing rule
   */
  update(rule: CategorizationRule): Promise<Result<CategorizationRule, BaseError>>;

  /**
   * Delete a rule
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Bulk create rules (for system rules)
   */
  bulkCreate(rules: CategorizationRule[]): Promise<Result<CategorizationRule[], BaseError>>;

  /**
   * Count rules matching criteria
   */
  count(options?: CategorizationRuleQueryOptions): Promise<Result<number, BaseError>>;
}
