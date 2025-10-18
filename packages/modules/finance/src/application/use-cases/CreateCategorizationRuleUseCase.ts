import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { ICategorizationRuleRepository } from '../../domain/interfaces/ICategorizationRuleRepository';
import { CategorizationRule, PatternType, RuleSource } from '../../domain/entities/CategorizationRule';
import { ExpenseCategory } from '../../domain/entities/Expense';

/**
 * Create Categorization Rule Input
 */
export interface CreateCategorizationRuleInput {
  userId: string;
  pattern: string;
  patternType: PatternType;
  category: ExpenseCategory;
  confidence?: number;
  priority?: number;
  source?: RuleSource;
}

/**
 * Create Categorization Rule Use Case
 *
 * Creates a new categorization rule.
 *
 * Use Case Pattern:
 * 1. Validate input
 * 2. Create domain entity
 * 3. Persist to repository
 * 4. Publish domain event
 * 5. Return result
 */
export class CreateCategorizationRuleUseCase {
  constructor(
    private readonly ruleRepository: ICategorizationRuleRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: CreateCategorizationRuleInput): Promise<Result<CategorizationRule, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Create domain entity
    let rule: CategorizationRule;
    try {
      rule = CategorizationRule.create(
        input.userId,
        input.pattern,
        input.patternType,
        input.category,
        {
          confidence: input.confidence,
          priority: input.priority,
          source: input.source,
        }
      );
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'RULE_CREATION_FAILED')
      );
    }

    // Step 3: Persist to repository
    const createResult = await this.ruleRepository.create(rule);
    if (createResult.isFail()) {
      return createResult;
    }

    // Step 4: Publish domain event
    await this.eventBus.publish({
      type: 'CategorizationRuleCreated',
      source: 'finance',
      payload: {
        ruleId: rule.id,
        pattern: rule.pattern,
        patternType: rule.patternType,
        category: rule.category,
        priority: rule.priority,
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    // Step 5: Return result
    return Result.ok(createResult.value);
  }

  /**
   * Validate input data
   */
  private validateInput(input: CreateCategorizationRuleInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    if (!input.pattern || input.pattern.trim().length === 0) {
      errors.push({ field: 'pattern', message: 'Pattern is required' });
    }

    if (input.pattern && input.pattern.length > 500) {
      errors.push({ field: 'pattern', message: 'Pattern must be less than 500 characters' });
    }

    if (!input.patternType) {
      errors.push({ field: 'patternType', message: 'Pattern type is required' });
    }

    if (!input.category) {
      errors.push({ field: 'category', message: 'Category is required' });
    }

    if (input.confidence !== undefined) {
      if (input.confidence < 0 || input.confidence > 1) {
        errors.push({ field: 'confidence', message: 'Confidence must be between 0 and 1' });
      }
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid rule data', errors));
    }

    return Result.ok(undefined);
  }
}
