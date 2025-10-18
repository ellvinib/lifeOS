import { Request, Response, NextFunction } from 'express';
import {
  SuggestCategoryUseCase,
  ProvideFeedbackUseCase,
  CreateCategorizationRuleUseCase,
} from '../../application/use-cases';

/**
 * Categorization Controller
 */
export class CategorizationController {
  constructor(
    private readonly suggestCategoryUseCase: SuggestCategoryUseCase,
    private readonly provideFeedbackUseCase: ProvideFeedbackUseCase,
    private readonly createRuleUseCase: CreateCategorizationRuleUseCase
  ) {}

  /**
   * Suggest category for transaction
   * POST /api/finance/categorization/suggest
   */
  async suggestCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = 'user-123'; // TODO: Get from auth
      const { transactionId } = req.body;

      const result = await this.suggestCategoryUseCase.execute({ userId, transactionId });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({ success: true, data: result.value });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Provide feedback on categorization
   * POST /api/finance/categorization/feedback
   */
  async provideFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = 'user-123'; // TODO: Get from auth
      const { transactionId, suggestedCategory, actualCategory, confidence } = req.body;

      const result = await this.provideFeedbackUseCase.execute({
        userId,
        transactionId,
        suggestedCategory,
        actualCategory,
        confidence,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({ success: true, data: { feedbackType: result.value.feedbackType } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create categorization rule
   * POST /api/finance/categorization/rules
   */
  async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = 'user-123'; // TODO: Get from auth
      const { pattern, patternType, category, confidence, priority } = req.body;

      const result = await this.createRuleUseCase.execute({
        userId,
        pattern,
        patternType,
        category,
        confidence,
        priority,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(201).json({ success: true, data: { ruleId: result.value.id } });
    } catch (error) {
      next(error);
    }
  }
}
