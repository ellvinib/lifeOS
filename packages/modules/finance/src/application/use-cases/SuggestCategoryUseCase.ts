import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, NotFoundError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IBankTransactionRepository } from '../../domain/interfaces';
import { CategorizationService, CategorizationSuggestion } from '../services/CategorizationService';

/**
 * Suggest Category Input
 */
export interface SuggestCategoryInput {
  userId: string;
  transactionId: string;
}

/**
 * Suggest Category Use Case
 *
 * Suggests a category for a bank transaction using hybrid categorization.
 *
 * Use Case Pattern:
 * 1. Validate input
 * 2. Get transaction
 * 3. Call categorization service
 * 4. Publish event (for analytics)
 * 5. Return suggestion
 */
export class SuggestCategoryUseCase {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly categorizationService: CategorizationService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: SuggestCategoryInput): Promise<Result<CategorizationSuggestion, BaseError>> {
    // Step 1: Validate input
    if (!input.userId || !input.transactionId) {
      return Result.fail(
        new ValidationError('userId and transactionId are required', [])
      );
    }

    // Step 2: Get transaction
    const transactionResult = await this.transactionRepository.findById(input.transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Step 3: Call categorization service
    const suggestionResult = await this.categorizationService.suggestCategory(
      input.userId,
      {
        description: transaction.description,
        amount: transaction.getAbsoluteAmount(),
        counterPartyName: transaction.counterPartyName,
        counterPartyIban: transaction.counterPartyIban,
        executionDate: transaction.executionDate,
      }
    );

    if (suggestionResult.isFail()) {
      return suggestionResult;
    }

    // Step 4: Publish event
    await this.eventBus.publish({
      type: 'CategorySuggested',
      source: 'finance',
      payload: {
        transactionId: transaction.id,
        suggestedCategory: suggestionResult.value.category,
        confidence: suggestionResult.value.confidence,
        source: suggestionResult.value.source,
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    // Step 5: Return suggestion
    return suggestionResult;
  }
}
