import { ExpenseCategory } from './Expense';

/**
 * Category Total Entity
 *
 * Aggregated spending data for a specific category in a specific month.
 * Pre-calculated for performance in the dashboard.
 */
export class CategoryTotal {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _month: Date,
    private readonly _category: ExpenseCategory,
    private readonly _totalAmount: number,
    private readonly _transactionCount: number,
    private readonly _averageAmount: number,
    private readonly _percentOfTotal: number,
    private readonly _largestTransaction: number,
    private readonly _budgetAmount: number | null,
    private readonly _budgetUsedPercent: number | null,
    private _calculatedAt: Date,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date
  ) {}

  // Getters
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get month(): Date {
    return this._month;
  }

  get category(): ExpenseCategory {
    return this._category;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get transactionCount(): number {
    return this._transactionCount;
  }

  get averageAmount(): number {
    return this._averageAmount;
  }

  get percentOfTotal(): number {
    return this._percentOfTotal;
  }

  get largestTransaction(): number {
    return this._largestTransaction;
  }

  get budgetAmount(): number | null {
    return this._budgetAmount;
  }

  get budgetUsedPercent(): number | null {
    return this._budgetUsedPercent;
  }

  get calculatedAt(): Date {
    return this._calculatedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Factory: Create new category total
   */
  public static create(
    userId: string,
    month: Date,
    category: ExpenseCategory,
    totalAmount: number,
    transactionCount: number,
    percentOfTotal: number,
    options?: {
      averageAmount?: number;
      largestTransaction?: number;
      budgetAmount?: number | null;
    }
  ): CategoryTotal {
    // Validations
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!month) {
      throw new Error('Month is required');
    }

    if (!category) {
      throw new Error('Category is required');
    }

    if (totalAmount < 0) {
      throw new Error('Total amount cannot be negative');
    }

    if (transactionCount < 0) {
      throw new Error('Transaction count cannot be negative');
    }

    if (percentOfTotal < 0 || percentOfTotal > 100) {
      throw new Error('Percent of total must be between 0 and 100');
    }

    // Calculate derived values
    const averageAmount =
      options?.averageAmount ??
      (transactionCount > 0 ? totalAmount / transactionCount : 0);

    const largestTransaction = options?.largestTransaction ?? totalAmount;
    const budgetAmount = options?.budgetAmount ?? null;

    const budgetUsedPercent =
      budgetAmount && budgetAmount > 0 ? (totalAmount / budgetAmount) * 100 : null;

    const now = new Date();

    return new CategoryTotal(
      crypto.randomUUID(),
      userId,
      month,
      category,
      totalAmount,
      transactionCount,
      averageAmount,
      percentOfTotal,
      largestTransaction,
      budgetAmount,
      budgetUsedPercent,
      now, // calculatedAt
      now, // createdAt
      now  // updatedAt
    );
  }

  /**
   * Factory: Reconstitute from persistence
   */
  public static reconstitute(
    id: string,
    userId: string,
    month: Date,
    category: ExpenseCategory,
    totalAmount: number,
    transactionCount: number,
    averageAmount: number,
    percentOfTotal: number,
    largestTransaction: number,
    budgetAmount: number | null,
    budgetUsedPercent: number | null,
    calculatedAt: Date,
    createdAt: Date,
    updatedAt: Date
  ): CategoryTotal {
    return new CategoryTotal(
      id,
      userId,
      month,
      category,
      totalAmount,
      transactionCount,
      averageAmount,
      percentOfTotal,
      largestTransaction,
      budgetAmount,
      budgetUsedPercent,
      calculatedAt,
      createdAt,
      updatedAt
    );
  }

  /**
   * Business Logic: Check if over budget
   */
  public isOverBudget(): boolean {
    if (!this._budgetAmount) return false;
    return this._totalAmount > this._budgetAmount;
  }

  /**
   * Business Logic: Check if approaching budget limit (>80%)
   */
  public isApproachingBudgetLimit(): boolean {
    if (!this._budgetUsedPercent) return false;
    return this._budgetUsedPercent > 80 && this._budgetUsedPercent <= 100;
  }

  /**
   * Business Logic: Get remaining budget
   */
  public getRemainingBudget(): number | null {
    if (!this._budgetAmount) return null;
    return Math.max(0, this._budgetAmount - this._totalAmount);
  }

  /**
   * Business Logic: Get budget overage
   */
  public getBudgetOverage(): number | null {
    if (!this._budgetAmount) return null;
    if (!this.isOverBudget()) return null;
    return this._totalAmount - this._budgetAmount;
  }

  /**
   * Business Logic: Compare to another period
   */
  public compareTo(other: CategoryTotal): {
    amountDelta: number;
    countDelta: number;
    percentChange: number;
  } {
    const amountDelta = this._totalAmount - other._totalAmount;
    const countDelta = this._transactionCount - other._transactionCount;
    const percentChange =
      other._totalAmount === 0 ? 0 : (amountDelta / other._totalAmount) * 100;

    return {
      amountDelta,
      countDelta,
      percentChange,
    };
  }

  /**
   * Business Logic: Check if stale (needs recalculation)
   */
  public isStale(maxAgeHours: number = 24): boolean {
    const ageInMs = Date.now() - this._calculatedAt.getTime();
    const ageInHours = ageInMs / (1000 * 60 * 60);
    return ageInHours > maxAgeHours;
  }

  /**
   * Business Logic: Check if this is the current month
   */
  public isCurrentMonth(): boolean {
    const now = new Date();
    return (
      this._month.getFullYear() === now.getFullYear() &&
      this._month.getMonth() === now.getMonth()
    );
  }

  /**
   * Update calculated timestamp
   */
  public markAsRecalculated(): void {
    this._calculatedAt = new Date();
  }
}
