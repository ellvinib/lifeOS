import { Request, Response, NextFunction } from 'express';
import { CreateAdvertisingExpenseUseCase } from '../../application/use-cases/CreateAdvertisingExpenseUseCase';
import { UpdateExpenseMetricsUseCase } from '../../application/use-cases/UpdateExpenseMetricsUseCase';
import { IAdvertisingExpenseRepository } from '../../domain/interfaces/IAdvertisingExpenseRepository';

/**
 * Advertising Expense Controller
 *
 * Thin controller for advertising expense operations.
 */
export class AdvertisingExpenseController {
  constructor(
    private readonly createExpenseUseCase: CreateAdvertisingExpenseUseCase,
    private readonly updateMetricsUseCase: UpdateExpenseMetricsUseCase,
    private readonly expenseRepository: IAdvertisingExpenseRepository
  ) {}

  /**
   * Create new advertising expense
   * POST /api/advertising/expenses
   */
  async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = {
        ...req.body,
        date: new Date(req.body.date),
      };

      const result = await this.createExpenseUseCase.execute(input);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(201).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense by ID
   * GET /api/advertising/expenses/:id
   */
  async getExpenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.expenseRepository.findById(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expenses by campaign
   * GET /api/advertising/campaigns/:campaignId/expenses
   */
  async getExpensesByCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const result = await this.expenseRepository.findByCampaignId(campaignId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update expense metrics
   * PATCH /api/advertising/expenses/:id/metrics
   */
  async updateMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const metrics = req.body;

      const result = await this.updateMetricsUseCase.execute(id, metrics);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete expense
   * DELETE /api/advertising/expenses/:id
   */
  async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.expenseRepository.delete(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
