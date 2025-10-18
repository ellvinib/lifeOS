/**
 * Budget Controller
 *
 * HTTP layer for budget operations.
 *
 * Responsibilities (THIN LAYER):
 * 1. Parse HTTP request
 * 2. Call use case
 * 3. Map result to HTTP response
 * 4. That's it!
 */

import type { Request, Response, NextFunction } from 'express';
import { GetTodayBudgetUseCase } from '../../../../modules/finance/src/application/use-cases/GetTodayBudgetUseCase';
import { GetEnvelopesUseCase } from '../../../../modules/finance/src/application/use-cases/GetEnvelopesUseCase';
import type { IExpenseRepository, IBudgetRepository } from '../../../../modules/finance/src/domain/interfaces';

/**
 * API Response wrapper for consistency with frontend expectations
 */
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Budget controller.
 *
 * Thin layer that coordinates HTTP ↔ Use Cases.
 */
export class BudgetController {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly expenseRepository: IExpenseRepository
  ) {}

  /**
   * GET /api/finance/budget/today
   * Get today's budget data.
   */
  async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = new GetTodayBudgetUseCase(
        this.budgetRepository,
        this.expenseRepository
      );

      const result = await useCase.execute();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const response: APIResponse<typeof result.value> = {
        success: true,
        data: result.value,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/finance/budget/envelopes
   * Get budget envelopes with spending data.
   */
  async getEnvelopes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = new GetEnvelopesUseCase(
        this.budgetRepository,
        this.expenseRepository
      );

      const result = await useCase.execute();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Transform the output to match frontend expectations
      const response: APIResponse<any> = {
        success: true,
        data: {
          envelopes: result.value.envelopes.map(env => ({
            id: env.category, // Use category as ID for now
            name: env.name,
            emoji: env.emoji,
            category: env.category,
            planned: env.planned,
            spent: env.spent,
            remaining: env.remaining,
            percentage: env.percentage,
            status: env.status,
            recentTransactions: env.recentTransactions.map(tx => ({
              id: `${tx.date.getTime()}-${tx.amount}`, // Generate ID from date+amount
              description: tx.description,
              amount: tx.amount,
              date: tx.date.toISOString(),
            })),
          })),
          summary: {
            totalBudget: result.value.totalBudget,
            totalSpent: result.value.totalSpent,
            totalRemaining: result.value.totalRemaining,
            totalAllocated: result.value.totalBudget, // totalAllocated = totalBudget
          },
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
