import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { CategorizationRule } from '../../domain/entities/CategorizationRule';
import { TransactionClassification, FeedbackType } from '../../domain/entities/TransactionClassification';

/**
 * Categorization Suggestion Result
 */
export interface CategorizationSuggestion {
  category: ExpenseCategory;
  confidence: number;  // 0-1
  reason: string;      // Explanation of why this category was suggested
  source: 'rule' | 'ml' | 'fallback';
}

/**
 * Transaction Data for Categorization
 */
export interface TransactionData {
  description: string;
  amount: number;
  counterPartyName?: string;
  counterPartyIban?: string;
  executionDate: Date;
}

/**
 * Categorization Service Interface
 */
export interface ICategorizationService {
  /**
   * Suggest a category for a transaction
   */
  suggestCategory(
    userId: string,
    transaction: TransactionData
  ): Promise<Result<CategorizationSuggestion, BaseError>>;

  /**
   * Learn from user feedback (add to training data)
   */
  learnFromFeedback(
    userId: string,
    transactionId: string,
    suggestedCategory: ExpenseCategory | undefined,
    actualCategory: ExpenseCategory,
    confidence?: number
  ): Promise<Result<TransactionClassification, BaseError>>;

  /**
   * Train or retrain ML model (future implementation)
   */
  trainModel(userId: string): Promise<Result<void, BaseError>>;
}

/**
 * Categorization Service Dependencies
 */
export interface CategorizationServiceDeps {
  getRulesByUserId: (userId: string) => Promise<Result<CategorizationRule[], BaseError>>;
  getClassificationsByUserId: (userId: string, limit?: number) => Promise<Result<TransactionClassification[], BaseError>>;
  saveClassification: (classification: TransactionClassification) => Promise<Result<TransactionClassification, BaseError>>;
}

/**
 * Categorization Service
 *
 * Implements hybrid categorization:
 * 1. Rule-based matching (fast, deterministic)
 * 2. ML-based prediction (smart, learns from user)
 * 3. Fallback to 'other' category
 *
 * The service uses confidence thresholds to determine when to use which method:
 * - High confidence (>0.8): Auto-apply
 * - Medium confidence (0.5-0.8): Suggest to user
 * - Low confidence (<0.5): Ask user / use fallback
 */
export class CategorizationService implements ICategorizationService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.5;
  private static readonly FALLBACK_CATEGORY: ExpenseCategory = 'other';

  constructor(private deps: CategorizationServiceDeps) {}

  /**
   * Suggest a category for a transaction
   */
  public async suggestCategory(
    userId: string,
    transaction: TransactionData
  ): Promise<Result<CategorizationSuggestion, BaseError>> {
    try {
      // Step 1: Try rule-based matching
      const ruleResult = await this.matchByRules(userId, transaction);
      if (ruleResult.isOk() && ruleResult.value.confidence >= CategorizationService.MEDIUM_CONFIDENCE_THRESHOLD) {
        return Result.ok(ruleResult.value);
      }

      // Step 2: Try ML-based prediction (future implementation)
      const mlResult = await this.predictByML(userId, transaction);
      if (mlResult.isOk() && mlResult.value.confidence >= CategorizationService.MEDIUM_CONFIDENCE_THRESHOLD) {
        return Result.ok(mlResult.value);
      }

      // Step 3: Use best available suggestion or fallback
      const bestSuggestion = this.selectBestSuggestion(
        ruleResult.isOk() ? ruleResult.value : null,
        mlResult.isOk() ? mlResult.value : null
      );

      return Result.ok(bestSuggestion);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'CATEGORIZATION_FAILED',
          'Failed to categorize transaction',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }

  /**
   * Match transaction using rule-based approach
   */
  private async matchByRules(
    userId: string,
    transaction: TransactionData
  ): Promise<Result<CategorizationSuggestion, BaseError>> {
    // Get all active rules for user, sorted by priority
    const rulesResult = await this.deps.getRulesByUserId(userId);
    if (rulesResult.isFail()) {
      return Result.fail(rulesResult.error);
    }

    const rules = rulesResult.value
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    // Prepare matching text (description + counter party)
    const matchText = [
      transaction.description,
      transaction.counterPartyName
    ].filter(Boolean).join(' ');

    // Find matching rules
    const matchingRules = rules.filter(rule =>
      rule.matches(matchText, transaction.counterPartyIban)
    );

    if (matchingRules.length === 0) {
      return Result.fail(
        new BaseError('NO_RULE_MATCH', 'No matching rules found', 404)
      );
    }

    // Use highest priority rule
    const bestRule = matchingRules[0];

    return Result.ok({
      category: bestRule.category,
      confidence: bestRule.confidence,
      reason: `Matched rule: "${bestRule.pattern}" (${bestRule.patternType})`,
      source: 'rule' as const,
    });
  }

  /**
   * Predict category using ML model
   * TODO: Implement actual ML prediction
   * For now, returns a basic heuristic-based prediction
   */
  private async predictByML(
    userId: string,
    transaction: TransactionData
  ): Promise<Result<CategorizationSuggestion, BaseError>> {
    // Get historical classifications for this user
    const classificationsResult = await this.deps.getClassificationsByUserId(userId, 100);
    if (classificationsResult.isFail() || classificationsResult.value.length < 10) {
      // Not enough training data
      return Result.fail(
        new BaseError('INSUFFICIENT_TRAINING_DATA', 'Not enough ML training data', 404)
      );
    }

    // TODO: Implement actual ML model
    // For now, use simple frequency-based heuristic
    const classifications = classificationsResult.value;

    // Count category frequencies
    const categoryFrequency: Map<ExpenseCategory, number> = new Map();
    for (const classification of classifications) {
      const count = categoryFrequency.get(classification.actualCategory) || 0;
      categoryFrequency.set(classification.actualCategory, count + 1);
    }

    // Find most common category
    let mostCommonCategory: ExpenseCategory = 'other';
    let maxFrequency = 0;

    for (const [category, frequency] of categoryFrequency.entries()) {
      if (frequency > maxFrequency) {
        mostCommonCategory = category;
        maxFrequency = frequency;
      }
    }

    // Calculate confidence based on frequency
    const confidence = Math.min(0.6, maxFrequency / classifications.length);

    return Result.ok({
      category: mostCommonCategory,
      confidence,
      reason: `ML prediction based on ${classifications.length} historical transactions`,
      source: 'ml' as const,
    });
  }

  /**
   * Select best suggestion from available options
   */
  private selectBestSuggestion(
    ruleSuggestion: CategorizationSuggestion | null,
    mlSuggestion: CategorizationSuggestion | null
  ): CategorizationSuggestion {
    // If both exist, use the one with higher confidence
    if (ruleSuggestion && mlSuggestion) {
      return ruleSuggestion.confidence >= mlSuggestion.confidence
        ? ruleSuggestion
        : mlSuggestion;
    }

    // Use whichever exists
    if (ruleSuggestion) return ruleSuggestion;
    if (mlSuggestion) return mlSuggestion;

    // Fallback
    return {
      category: CategorizationService.FALLBACK_CATEGORY,
      confidence: 0.3,
      reason: 'No matching rules or ML prediction available',
      source: 'fallback' as const,
    };
  }

  /**
   * Learn from user feedback
   */
  public async learnFromFeedback(
    userId: string,
    transactionId: string,
    suggestedCategory: ExpenseCategory | undefined,
    actualCategory: ExpenseCategory,
    confidence?: number
  ): Promise<Result<TransactionClassification, BaseError>> {
    try {
      let classification: TransactionClassification;

      // Determine feedback type
      if (!suggestedCategory) {
        // No suggestion was made, user provided category manually
        classification = TransactionClassification.createRejected(
          userId,
          transactionId,
          actualCategory,
          undefined,
          confidence
        );
      } else if (suggestedCategory === actualCategory) {
        // User confirmed the suggestion
        classification = TransactionClassification.createConfirmed(
          userId,
          transactionId,
          actualCategory,
          confidence
        );
      } else {
        // User corrected the suggestion
        classification = TransactionClassification.createCorrected(
          userId,
          transactionId,
          suggestedCategory,
          actualCategory,
          confidence
        );
      }

      // Save classification for ML training
      const saveResult = await this.deps.saveClassification(classification);
      if (saveResult.isFail()) {
        return Result.fail(saveResult.error);
      }

      return Result.ok(classification);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'FEEDBACK_RECORDING_FAILED',
          'Failed to record categorization feedback',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }

  /**
   * Train or retrain ML model
   * TODO: Implement actual ML model training
   */
  public async trainModel(userId: string): Promise<Result<void, BaseError>> {
    try {
      // Get all classifications for this user
      const classificationsResult = await this.deps.getClassificationsByUserId(userId);
      if (classificationsResult.isFail()) {
        return Result.fail(classificationsResult.error);
      }

      const classifications = classificationsResult.value;

      if (classifications.length < 50) {
        return Result.fail(
          new BaseError(
            'INSUFFICIENT_TRAINING_DATA',
            'At least 50 classifications required for ML training',
            400
          )
        );
      }

      // TODO: Implement actual ML model training
      // This would involve:
      // 1. Feature extraction from transactions
      // 2. Training a classification model (Random Forest, Naive Bayes, or Neural Network)
      // 3. Cross-validation
      // 4. Model persistence
      // 5. Model versioning

      console.log(`[CategorizationService] Would train ML model with ${classifications.length} examples`);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'MODEL_TRAINING_FAILED',
          'Failed to train ML model',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }
}
