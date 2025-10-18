import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { TransactionClassification } from '../../domain/entities/TransactionClassification';
import { CategorizationService } from '../services/CategorizationService';

/**
 * Provide Feedback Input
 */
export interface ProvideFeedbackInput {
  userId: string;
  transactionId: string;
  suggestedCategory?: ExpenseCategory;
  actualCategory: ExpenseCategory;
  confidence?: number;
}

/**
 * Provide Feedback Use Case
 *
 * Records user feedback on category suggestions for ML training.
 *
 * Use Case Pattern:
 * 1. Validate input
 * 2. Call categorization service to record feedback
 * 3. Publish event
 * 4. Return classification
 */
export class ProvideFeedbackUseCase {
  constructor(
    private readonly categorizationService: CategorizationService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: ProvideFeedbackInput): Promise<Result<TransactionClassification, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Record feedback
    const feedbackResult = await this.categorizationService.learnFromFeedback(
      input.userId,
      input.transactionId,
      input.suggestedCategory,
      input.actualCategory,
      input.confidence
    );

    if (feedbackResult.isFail()) {
      return feedbackResult;
    }

    const classification = feedbackResult.value;

    // Step 3: Publish event
    await this.eventBus.publish({
      type: 'CategorizationFeedbackProvided',
      source: 'finance',
      payload: {
        transactionId: input.transactionId,
        suggestedCategory: input.suggestedCategory,
        actualCategory: input.actualCategory,
        feedbackType: classification.feedbackType,
        isHighValue: classification.isHighValueTrainingData(),
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    // Step 4: Return classification
    return Result.ok(classification);
  }

  /**
   * Validate input data
   */
  private validateInput(input: ProvideFeedbackInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    if (!input.transactionId) {
      errors.push({ field: 'transactionId', message: 'Transaction ID is required' });
    }

    if (!input.actualCategory) {
      errors.push({ field: 'actualCategory', message: 'Actual category is required' });
    }

    if (input.confidence !== undefined) {
      if (input.confidence < 0 || input.confidence > 1) {
        errors.push({ field: 'confidence', message: 'Confidence must be between 0 and 1' });
      }
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid feedback data', errors));
    }

    return Result.ok(undefined);
  }
}
