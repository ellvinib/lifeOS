import { Request, Response, NextFunction } from 'express';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ReconciliationStatus } from '../../domain/value-objects/BankEnums';
import { ExpenseCategory } from '../../domain/value-objects/ExpenseCategory';
import {
  GetTransactionUseCase,
  ListTransactionsUseCase,
  UpdateTransactionUseCase,
  DeleteTransactionUseCase,
  ImportTransactionsUseCase,
} from '../../application/use-cases';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';
import { IEventBus } from '@lifeOS/core/events';

/**
 * Transaction Controller
 *
 * Thin HTTP layer that coordinates between HTTP requests and transaction use cases.
 *
 * Responsibilities:
 * - Parse and validate HTTP requests
 * - Call appropriate use cases
 * - Transform domain results to HTTP responses
 * - Handle errors consistently
 *
 * Business logic lives in use cases, not here.
 */
export class TransactionController {
  private readonly getUseCase: GetTransactionUseCase;
  private readonly listUseCase: ListTransactionsUseCase;
  private readonly updateUseCase: UpdateTransactionUseCase;
  private readonly deleteUseCase: DeleteTransactionUseCase;
  private readonly importUseCase: ImportTransactionsUseCase;

  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly eventBus: IEventBus
  ) {
    this.getUseCase = new GetTransactionUseCase(transactionRepository);
    this.listUseCase = new ListTransactionsUseCase(transactionRepository);
    this.updateUseCase = new UpdateTransactionUseCase(transactionRepository, eventBus);
    this.deleteUseCase = new DeleteTransactionUseCase(transactionRepository, eventBus);
    this.importUseCase = new ImportTransactionsUseCase(transactionRepository, eventBus);
  }

  /**
   * GET /transactions/:id - Get single transaction
   */
  async getTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    const result = await this.getUseCase.execute(id);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: this.toTransactionDTO(result.value),
    });
  }

  /**
   * GET /transactions - List transactions with filters
   */
  async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { bankAccountId, userId, reconciliationStatus, startDate, endDate, limit } = req.query;

    const filters = {
      bankAccountId: bankAccountId as string | undefined,
      userId: userId as string | undefined,
      reconciliationStatus: reconciliationStatus as ReconciliationStatus | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    };

    const result = await this.listUseCase.execute(filters);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value.map((transaction) => this.toTransactionDTO(transaction)),
      meta: {
        count: result.value.length,
        filters,
      },
    });
  }

  /**
   * GET /transactions/unreconciled - Get unreconciled transactions
   */
  async getUnreconciledTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { userId } = req.query;

    const result = await this.listUseCase.getUnreconciled(userId as string);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value.map((transaction) => this.toTransactionDTO(transaction)),
      meta: {
        count: result.value.length,
      },
    });
  }

  /**
   * GET /transactions/by-status - Get transactions by reconciliation status
   */
  async getTransactionsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { bankAccountId, status } = req.query;

    const result = await this.listUseCase.getByReconciliationStatus(
      bankAccountId as string,
      status as ReconciliationStatus
    );

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value.map((transaction) => this.toTransactionDTO(transaction)),
      meta: {
        count: result.value.length,
        status,
      },
    });
  }

  /**
   * GET /transactions/potential-matches - Get potential matches for amount and date
   */
  async getPotentialMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { userId, amount, date, toleranceDays } = req.query;

    const result = await this.listUseCase.getPotentialMatches(
      userId as string,
      parseFloat(amount as string),
      new Date(date as string),
      toleranceDays ? parseInt(toleranceDays as string, 10) : undefined
    );

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value.map((transaction) => this.toTransactionDTO(transaction)),
      meta: {
        count: result.value.length,
        criteria: {
          amount: parseFloat(amount as string),
          date: date as string,
          toleranceDays: toleranceDays ? parseInt(toleranceDays as string, 10) : 3,
        },
      },
    });
  }

  /**
   * PATCH /transactions/:id - Update transaction
   */
  async updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const { suggestedCategory, confidenceScore } = req.body;

    const updates = {
      suggestedCategory: suggestedCategory as ExpenseCategory | undefined,
      confidenceScore: confidenceScore as number | undefined,
    };

    const result = await this.updateUseCase.execute(id, updates);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: this.toTransactionDTO(result.value),
      message: 'Transaction updated successfully',
    });
  }

  /**
   * POST /transactions/:id/ignore - Mark transaction as ignored
   */
  async ignoreTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    const result = await this.updateUseCase.ignore(id);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: this.toTransactionDTO(result.value),
      message: 'Transaction marked as ignored',
    });
  }

  /**
   * POST /transactions/:id/unignore - Unignore transaction
   */
  async unignoreTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    const result = await this.updateUseCase.unignore(id);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: this.toTransactionDTO(result.value),
      message: 'Transaction unignored',
    });
  }

  /**
   * DELETE /transactions/:id - Delete transaction
   */
  async deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const { force } = req.query;

    const options = {
      force: force === 'true',
    };

    const result = await this.deleteUseCase.execute(id, options);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  }

  /**
   * POST /transactions/:id/soft-delete - Soft delete transaction (recommended)
   */
  async softDeleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    const result = await this.deleteUseCase.softDelete(id);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: this.toTransactionDTO(result.value),
      message: 'Transaction soft deleted (marked as ignored)',
    });
  }

  /**
   * POST /transactions/batch/update-category - Batch update category
   */
  async batchUpdateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { transactionIds, category, confidence } = req.body;

    const result = await this.updateUseCase.batchUpdateCategory(
      transactionIds as string[],
      category as ExpenseCategory,
      confidence as number
    );

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value,
      message: `Updated ${result.value.updated} transactions, ${result.value.failed} failed`,
    });
  }

  /**
   * POST /transactions/batch/delete - Batch delete transactions
   */
  async batchDeleteTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { transactionIds, force } = req.body;

    const options = {
      force: force as boolean | undefined,
    };

    const result = await this.deleteUseCase.executeBatch(transactionIds as string[], options);

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value,
      message: `Deleted ${result.value.deleted} transactions, ${result.value.failed} failed`,
    });
  }

  /**
   * POST /transactions/import - Import transactions from CSV
   */
  async importTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          message: 'CSV file is required',
          code: 'MISSING_FILE',
        },
      });
      return;
    }

    const { bankAccountId, userId, encoding, skipDuplicates, updateExisting } = req.body;

    const options = {
      userId: userId as string | undefined,
      encoding: (encoding as BufferEncoding) || 'utf-8',
      skipDuplicates: skipDuplicates !== undefined ? skipDuplicates === 'true' : true,
      updateExisting: updateExisting !== undefined ? updateExisting === 'true' : false,
    };

    const result = await this.importUseCase.execute(
      req.file.buffer,
      bankAccountId as string,
      options
    );

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(201).json({
      success: true,
      data: result.value,
      message: `Imported ${result.value.imported} transactions, skipped ${result.value.skipped} duplicates`,
    });
  }

  /**
   * POST /transactions/import/preview - Preview CSV import without saving
   */
  async previewImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          message: 'CSV file is required',
          code: 'MISSING_FILE',
        },
      });
      return;
    }

    const { encoding } = req.body;

    const result = await this.importUseCase.preview(
      req.file.buffer,
      (encoding as BufferEncoding) || 'utf-8'
    );

    if (result.isFail()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        preview: result.value.slice(0, 10), // Only return first 10 for preview
        total: result.value.length,
      },
      message: `Preview of ${result.value.length} transactions`,
    });
  }

  /**
   * Transform BankTransaction entity to DTO for API response
   */
  private toTransactionDTO(transaction: BankTransaction): any {
    return {
      id: transaction.id,
      bankAccountId: transaction.bankAccountId,
      transactionDate: transaction.transactionDate.toISOString(),
      amount: transaction.amount,
      description: transaction.description,
      counterparty: transaction.counterparty,
      category: transaction.category,
      reconciliationStatus: transaction.reconciliationStatus,
      suggestedCategory: transaction.suggestedCategory,
      confidenceScore: transaction.confidenceScore,
      externalId: transaction.externalId,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }
}
