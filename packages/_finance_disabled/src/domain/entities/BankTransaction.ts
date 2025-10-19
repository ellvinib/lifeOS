/**
 * BankTransaction Entity
 *
 * Represents a bank transaction imported from Ibanity.
 * Contains reconciliation logic to match with manual expenses.
 */

import { Money } from '../value-objects/Money';
import { ReconciliationStatus } from '../value-objects/BankEnums';
import { ExpenseCategory } from '../value-objects/ExpenseCategory';

export interface BankTransactionProps {
  id: string;
  bankAccountId: string;
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  counterPartyName?: string;
  counterPartyIban?: string;
  executionDate: Date;
  valueDate?: Date;
  reconciliationStatus: ReconciliationStatus;
  reconciledExpenseId?: string;
  suggestedCategory?: ExpenseCategory;
  confidenceScore?: number;
  createdAt: Date;
}

export class BankTransaction {
  private constructor(private props: BankTransactionProps) {
    this.validate();
  }

  /**
   * Create a new BankTransaction instance
   */
  public static create(
    props: Omit<BankTransactionProps, 'id' | 'reconciliationStatus' | 'createdAt'>
  ): BankTransaction {
    return new BankTransaction({
      ...props,
      id: crypto.randomUUID(),
      reconciliationStatus: ReconciliationStatus.PENDING,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitute from database
   */
  public static fromPersistence(props: BankTransactionProps): BankTransaction {
    return new BankTransaction(props);
  }

  /**
   * Validate business rules
   */
  private validate(): void {
    if (!this.props.bankAccountId) {
      throw new Error('Bank account ID is required');
    }
    if (!this.props.externalId) {
      throw new Error('External ID is required');
    }
    if (this.props.amount === 0) {
      throw new Error('Transaction amount cannot be zero');
    }
    if (!this.props.description) {
      throw new Error('Description is required');
    }
  }

  // ============================================================================
  // Business Logic Methods
  // ============================================================================

  /**
   * Check if transaction is reconciled
   */
  public isReconciled(): boolean {
    return this.props.reconciliationStatus === ReconciliationStatus.MATCHED;
  }

  /**
   * Check if transaction is ignored
   */
  public isIgnored(): boolean {
    return this.props.reconciliationStatus === ReconciliationStatus.IGNORED;
  }

  /**
   * Check if transaction is pending reconciliation
   */
  public isPending(): boolean {
    return this.props.reconciliationStatus === ReconciliationStatus.PENDING;
  }

  /**
   * Reconcile with an existing expense
   */
  public reconcileWith(expenseId: string): void {
    if (this.isReconciled()) {
      throw new Error('Transaction is already reconciled');
    }
    this.props.reconciledExpenseId = expenseId;
    this.props.reconciliationStatus = ReconciliationStatus.MATCHED;
  }

  /**
   * Unreconcile (remove link to expense)
   */
  public unreconcile(): void {
    this.props.reconciledExpenseId = undefined;
    this.props.reconciliationStatus = ReconciliationStatus.PENDING;
  }

  /**
   * Mark as ignored (user doesn't want to track this)
   */
  public ignore(): void {
    if (this.isReconciled()) {
      throw new Error('Cannot ignore a reconciled transaction');
    }
    this.props.reconciliationStatus = ReconciliationStatus.IGNORED;
    this.props.reconciledExpenseId = undefined;
  }

  /**
   * Un-ignore (back to pending)
   */
  public unignore(): void {
    if (this.props.reconciliationStatus === ReconciliationStatus.IGNORED) {
      this.props.reconciliationStatus = ReconciliationStatus.PENDING;
    }
  }

  /**
   * Set AI-suggested category
   */
  public setSuggestedCategory(category: ExpenseCategory, confidence: number): void {
    if (confidence < 0 || confidence > 100) {
      throw new Error('Confidence score must be between 0 and 100');
    }
    this.props.suggestedCategory = category;
    this.props.confidenceScore = confidence;
  }

  /**
   * Check if this is an expense (negative amount) or income (positive)
   */
  public isExpense(): boolean {
    return this.props.amount < 0;
  }

  /**
   * Check if this is income (positive amount)
   */
  public isIncome(): boolean {
    return this.props.amount > 0;
  }

  /**
   * Get absolute amount (always positive)
   */
  public getAbsoluteAmount(): number {
    return Math.abs(this.props.amount);
  }

  /**
   * Get amount as Money value object
   */
  public getAmountMoney(): Money {
    return Money.fromDecimal(this.props.amount, this.props.currency);
  }

  /**
   * Get absolute amount as Money value object
   */
  public getAbsoluteAmountMoney(): Money {
    return Money.fromDecimal(this.getAbsoluteAmount(), this.props.currency);
  }

  /**
   * Match score with potential expense (0-100)
   * Used for auto-matching algorithm
   */
  public calculateMatchScore(
    expenseAmount: number,
    expenseDate: Date,
    expenseDescription?: string
  ): number {
    let score = 0;

    // Amount match (±€0.10 tolerance) - 50 points
    const amountDiff = Math.abs(this.getAbsoluteAmount() - expenseAmount);
    if (amountDiff === 0) {
      score += 50;
    } else if (amountDiff <= 0.10) {
      score += 40;
    } else if (amountDiff <= 1.00) {
      score += 20;
    }

    // Date match (±3 days) - 30 points
    const daysDiff = Math.abs(
      (this.props.executionDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === 0) {
      score += 30;
    } else if (daysDiff <= 1) {
      score += 25;
    } else if (daysDiff <= 3) {
      score += 15;
    }

    // Description similarity - 20 points
    if (expenseDescription && this.props.description) {
      const similarity = this.calculateStringSimilarity(
        this.props.description.toLowerCase(),
        expenseDescription.toLowerCase()
      );
      score += Math.floor(similarity * 20);
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate string similarity (Levenshtein distance normalized)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // ============================================================================
  // Getters
  // ============================================================================

  public get id(): string {
    return this.props.id;
  }

  public get bankAccountId(): string {
    return this.props.bankAccountId;
  }

  public get externalId(): string {
    return this.props.externalId;
  }

  public get amount(): number {
    return this.props.amount;
  }

  public get currency(): string {
    return this.props.currency;
  }

  public get description(): string {
    return this.props.description;
  }

  public get counterPartyName(): string | undefined {
    return this.props.counterPartyName;
  }

  public get counterPartyIban(): string | undefined {
    return this.props.counterPartyIban;
  }

  public get executionDate(): Date {
    return this.props.executionDate;
  }

  public get valueDate(): Date | undefined {
    return this.props.valueDate;
  }

  public get reconciliationStatus(): ReconciliationStatus {
    return this.props.reconciliationStatus;
  }

  public get reconciledExpenseId(): string | undefined {
    return this.props.reconciledExpenseId;
  }

  public get suggestedCategory(): ExpenseCategory | undefined {
    return this.props.suggestedCategory;
  }

  public get confidenceScore(): number | undefined {
    return this.props.confidenceScore;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
