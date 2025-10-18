import { Request, Response, NextFunction } from 'express';
import {
  GetTodayBudgetUseCase,
  CheckAffordabilityUseCase,
  GetEnvelopesUseCase,
} from '../../application/use-cases';
import {
  BudgetDTOMapper,
  AffordabilityCheckRequestDTO,
} from '../../application/dtos';

/**
 * Budget Controller
 *
 * Handles all budget-related endpoints:
 * - TODAY view data
 * - Pre-purchase affordability check
 * - Envelope budgets
 */
export class BudgetController {
  constructor(
    private readonly getTodayBudgetUseCase: GetTodayBudgetUseCase,
    private readonly checkAffordabilityUseCase: CheckAffordabilityUseCase,
    private readonly getEnvelopesUseCase: GetEnvelopesUseCase
  ) {}

  /**
   * Get today's budget status
   * GET /api/finance/budget/today
   *
   * Powers the TODAY view in the UI
   */
  async getTodayBudget(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract userId from authenticated request
      const userId = req.user!.userId;

      // Execute use case with userId
      const result = await this.getTodayBudgetUseCase.execute(userId);

      // Handle result
      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BudgetDTOMapper.toTodayBudgetDTO(result.value);

      // Return success response
      res.status(200).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if purchase is affordable
   * POST /api/finance/budget/check-affordability
   *
   * Powers the "Kan ik dit betalen?" widget
   */
  async checkAffordability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Parse request (validation done by middleware)
      const dto: AffordabilityCheckRequestDTO = req.body;

      // Execute use case
      const result = await this.checkAffordabilityUseCase.execute({
        amount: dto.amount,
        category: dto.category,
      });

      // Handle result
      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BudgetDTOMapper.toAffordabilityCheckDTO(result.value);

      // Return success response
      res.status(200).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all budget envelopes
   * GET /api/finance/budget/envelopes
   *
   * Powers the envelope cards in the UI
   */
  async getEnvelopes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract userId from authenticated request
      const userId = req.user!.userId;

      // Execute use case with userId
      const result = await this.getEnvelopesUseCase.execute(userId);

      // Handle result
      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BudgetDTOMapper.toEnvelopesDTO(result.value);

      // Return success response
      res.status(200).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new budget
   * POST /api/finance/budget
   */
  async createBudget(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Implement CreateBudgetUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update budget
   * PUT /api/finance/budget/:id
   */
  async updateBudget(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Implement UpdateBudgetUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }
}
