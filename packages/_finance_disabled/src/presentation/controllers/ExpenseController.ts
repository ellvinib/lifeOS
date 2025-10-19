import { Request, Response, NextFunction } from 'express';
import { CreateExpenseUseCase } from '../../application/use-cases';
import { ExpenseDTOMapper, ExpenseRequestDTO } from '../../application/dtos';

/**
 * Expense Controller
 *
 * Thin controller that coordinates HTTP ↔ Use Cases.
 * No business logic - only request/response handling.
 *
 * Pattern:
 * 1. Parse request
 * 2. Call use case
 * 3. Map result to DTO
 * 4. Return response (or pass error to error handler)
 */
export class ExpenseController {
  constructor(
    private readonly createExpenseUseCase: CreateExpenseUseCase
  ) {}

  /**
   * Create new expense
   * POST /api/finance/expenses
   */
  async createExpense(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract userId from authenticated request
      const userId = req.user!.userId;

      // Parse request (validation done by middleware)
      const dto: ExpenseRequestDTO = req.body;

      // Convert DTO to use case input
      const input = ExpenseDTOMapper.fromRequestDTO(dto);

      // Execute use case with userId
      const result = await this.createExpenseUseCase.execute(input, userId);

      // Handle result
      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = ExpenseDTOMapper.toResponseDTO(result.value);

      // Return success response
      res.status(201).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense by ID
   * GET /api/finance/expenses/:id
   */
  async getExpenseById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Implement GetExpenseByIdUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all expenses with filters
   * GET /api/finance/expenses
   */
  async getAllExpenses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Implement GetAllExpensesUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update expense
   * PUT /api/finance/expenses/:id
   */
  async updateExpense(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Implement UpdateExpenseUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete expense
   * DELETE /api/finance/expenses/:id
   */
  async deleteExpense(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Implement DeleteExpenseUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }
}
