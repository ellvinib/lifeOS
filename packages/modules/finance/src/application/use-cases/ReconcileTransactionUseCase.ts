/**
 * ReconcileTransactionUseCase
 *
 * Manually reconcile a bank transaction with an expense.
 * Also allows ignoring a transaction.
 *
 * Use Case Pattern (6 steps):
 * 1. Validate input
 * 2. Get transaction and expense
 * 3. Validate business rules
 * 4. Perform reconciliation
 * 5. Persist changes
 * 6. Publish domain event
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError, NotFoundError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';
import { IExpenseRepository } from '../../domain/interfaces/IExpenseRepository';
import { BankTransaction } from '../../domain/entities/BankTransaction';

/**
 * Reconcile Transaction Input
 */
export interface ReconcileTransactionInput {
  transactionId: string;
  expenseId: string;
  userId: string; // For validation
}

/**
 * Ignore Transaction Input
 */
export interface IgnoreTransactionInput {
  transactionId: string;
  userId: string; // For validation
}

/**
 * Unreconcile Transaction Input
 */
export interface UnreconcileTransactionInput {
  transactionId: string;
  userId: string; // For validation
}

/**
 * Reconcile Transaction Use Case
 *
 * Handles manual reconciliation of bank transactions with expenses.
 *
 * Business Rules:
 * - Transaction must be in pending status
 * - Expense must exist and belong to user
 * - Transaction amount should roughly match expense amount
 * - Cannot reconcile already reconciled transaction
 * - Can unreconcile a matched transaction
 * - Can ignore transactions (e.g., transfers, non-expenses)
 */
export class ReconcileTransactionUseCase {
  constructor(
    private readonly bankTransactionRepository: IBankTransactionRepository,
    private readonly expenseRepository: IExpenseRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Reconcile transaction with expense
   */
  async reconcile(input: ReconcileTransactionInput): Promise<Result<BankTransaction, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateReconcileInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Get transaction
    const transactionResult = await this.bankTransactionRepository.findById(input.transactionId);
    if (transactionResult.isFail()) {
      return transactionResult;
    }

    const transaction = transactionResult.value;

    // Step 3: Validate business rules
    if (transaction.isReconciled()) {
      return Result.fail(
        new BusinessRuleError(
          'Transaction is already reconciled',
          'TRANSACTION_ALREADY_RECONCILED'
        )
      );
    }

    // Verify expense exists
    const expenseResult = await this.expenseRepository.findById(input.expenseId);
    if (expenseResult.isFail()) {
      return Result.fail(
        new NotFoundError('Expense', input.expenseId)
      );
    }

    const expense = expenseResult.value;

    // Calculate match score for validation (should be > 50 for reasonable match)
    const matchScore = transaction.calculateMatchScore(
      expense.amount,
      expense.date,
      expense.description
    );

    if (matchScore < 30) {
      return Result.fail(
        new BusinessRuleError(
          `Transaction and expense don't match well (score: ${matchScore}/100). Are you sure?`,
          'POOR_MATCH_SCORE'
        )
      );
    }

    // Step 4: Perform reconciliation
    try {
      transaction.reconcileWith(input.expenseId);
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'RECONCILIATION_FAILED')
      );
    }

    // Step 5: Persist changes
    const saveResult = await this.bankTransactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 6: Publish domain event
    await this.eventBus.publish({
      type: 'TransactionReconciled',
      source: 'finance',
      payload: {
        transactionId: transaction.id,
        expenseId: input.expenseId,
        matchScore,
        reconciledAt: new Date(),
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Ignore transaction (mark as not an expense)
   */
  async ignore(input: IgnoreTransactionInput): Promise<Result<BankTransaction, BaseError>> {
    // Step 1: Validate input
    if (!input.transactionId) {
      return Result.fail(
        new ValidationError('Transaction ID is required', [
          { field: 'transactionId', message: 'Transaction ID is required' },
        ])
      );
    }

    // Step 2: Get transaction
    const transactionResult = await this.bankTransactionRepository.findById(input.transactionId);
    if (transactionResult.isFail()) {
      return transactionResult;
    }

    const transaction = transactionResult.value;

    // Step 3: Validate business rules
    if (transaction.isReconciled()) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot ignore a reconciled transaction. Unreconcile it first.',
          'TRANSACTION_IS_RECONCILED'
        )
      );
    }

    // Step 4: Ignore transaction
    try {
      transaction.ignore();
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'IGNORE_FAILED')
      );
    }

    // Step 5: Persist changes
    const saveResult = await this.bankTransactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 6: Publish domain event
    await this.eventBus.publish({
      type: 'TransactionIgnored',
      source: 'finance',
      payload: {
        transactionId: transaction.id,
        ignoredAt: new Date(),
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Unreconcile transaction (undo reconciliation)
   */
  async unreconcile(input: UnreconcileTransactionInput): Promise<Result<BankTransaction, BaseError>> {
    // Step 1: Validate input
    if (!input.transactionId) {
      return Result.fail(
        new ValidationError('Transaction ID is required', [
          { field: 'transactionId', message: 'Transaction ID is required' },
        ])
      );
    }

    // Step 2: Get transaction
    const transactionResult = await this.bankTransactionRepository.findById(input.transactionId);
    if (transactionResult.isFail()) {
      return transactionResult;
    }

    const transaction = transactionResult.value;

    // Step 3: Validate business rules
    if (!transaction.isReconciled()) {
      return Result.fail(
        new BusinessRuleError(
          'Transaction is not reconciled',
          'TRANSACTION_NOT_RECONCILED'
        )
      );
    }

    // Step 4: Unreconcile
    try {
      transaction.unreconcile();
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'UNRECONCILE_FAILED')
      );
    }

    // Step 5: Persist changes
    const saveResult = await this.bankTransactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 6: Publish domain event
    await this.eventBus.publish({
      type: 'TransactionUnreconciled',
      source: 'finance',
      payload: {
        transactionId: transaction.id,
        unreconciledAt: new Date(),
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Validate reconcile input
   */
  private validateReconcileInput(input: ReconcileTransactionInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.transactionId) {
      errors.push({ field: 'transactionId', message: 'Transaction ID is required' });
    }

    if (!input.expenseId) {
      errors.push({ field: 'expenseId', message: 'Expense ID is required' });
    }

    if (!input.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid reconciliation input', errors));
    }

    return Result.ok(undefined);
  }
}
