/**
 * BankTransactionDTO
 *
 * Data Transfer Objects for bank transactions and reconciliation.
 */

import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ReconciliationStatus } from '../../domain/value-objects/BankEnums';

/**
 * Bank Transaction Response DTO
 *
 * Used for returning transaction data via API
 */
export interface BankTransactionResponseDTO {
  id: string;
  bankAccountId: string;
  amount: number;
  currency: string;
  description: string;
  counterPartyName?: string;
  counterPartyIban?: string;
  executionDate: string; // ISO 8601 format
  valueDate?: string; // ISO 8601 format
  reconciliationStatus: ReconciliationStatus;
  reconciledExpenseId?: string;
  suggestedCategory?: string;
  confidenceScore?: number;
  createdAt: string; // ISO 8601 format
  // Computed fields
  isExpense: boolean; // True if amount < 0
  isIncome: boolean; // True if amount > 0
  absoluteAmount: number; // Absolute value of amount
}

/**
 * Bank Transaction List Query Parameters
 */
export interface BankTransactionQueryDTO {
  bankAccountId?: string;
  startDate?: string; // ISO 8601 format
  endDate?: string; // ISO 8601 format
  reconciliationStatus?: ReconciliationStatus;
  limit?: number;
}

/**
 * Reconcile Transaction Request DTO
 */
export interface ReconcileTransactionRequestDTO {
  expenseId: string;
}

/**
 * Transaction Statistics Response DTO
 */
export interface TransactionStatisticsResponseDTO {
  total: number;
  pending: number;
  matched: number;
  ignored: number;
  totalExpenses: number;
  totalIncome: number;
}

/**
 * Potential Match Response DTO
 *
 * Used for auto-matching suggestions
 */
export interface PotentialMatchResponseDTO {
  transaction: BankTransactionResponseDTO;
  matchScore: number; // 0-100
  reason: string; // Explanation of why it's a match
}

/**
 * BankTransaction DTO Mapper
 *
 * Maps between domain entities and DTOs
 */
export class BankTransactionDTOMapper {
  /**
   * Convert domain entity to response DTO
   */
  public static toResponseDTO(transaction: BankTransaction): BankTransactionResponseDTO {
    return {
      id: transaction.id,
      bankAccountId: transaction.bankAccountId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      counterPartyName: transaction.counterPartyName,
      counterPartyIban: transaction.counterPartyIban,
      executionDate: transaction.executionDate.toISOString(),
      valueDate: transaction.valueDate?.toISOString(),
      reconciliationStatus: transaction.reconciliationStatus,
      reconciledExpenseId: transaction.reconciledExpenseId,
      suggestedCategory: transaction.suggestedCategory,
      confidenceScore: transaction.confidenceScore,
      createdAt: transaction.createdAt.toISOString(),
      // Computed fields
      isExpense: transaction.isExpense(),
      isIncome: transaction.isIncome(),
      absoluteAmount: transaction.getAbsoluteAmount(),
    };
  }

  /**
   * Convert array of domain entities to response DTOs
   */
  public static toResponseDTOs(transactions: BankTransaction[]): BankTransactionResponseDTO[] {
    return transactions.map(t => this.toResponseDTO(t));
  }

  /**
   * Create potential match response with score
   */
  public static toPotentialMatchDTO(
    transaction: BankTransaction,
    matchScore: number,
    expenseAmount: number,
    expenseDate: Date
  ): PotentialMatchResponseDTO {
    let reason = '';

    // Build explanation
    const amountDiff = Math.abs(transaction.getAbsoluteAmount() - expenseAmount);
    const daysDiff = Math.abs(
      (transaction.executionDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (amountDiff === 0) {
      reason = 'Exact amount match';
    } else if (amountDiff <= 0.10) {
      reason = `Amount match within €${amountDiff.toFixed(2)}`;
    } else {
      reason = `Similar amount (±€${amountDiff.toFixed(2)})`;
    }

    if (daysDiff === 0) {
      reason += ', same date';
    } else if (daysDiff <= 3) {
      reason += `, ${Math.floor(daysDiff)} day${daysDiff > 1 ? 's' : ''} difference`;
    }

    return {
      transaction: this.toResponseDTO(transaction),
      matchScore,
      reason,
    };
  }
}
