/**
 * Monthly Summary Entity
 *
 * Aggregated financial data for a specific month.
 * Pre-calculated for performance in the dashboard.
 */
export class MonthlySummary {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _month: Date,
    private readonly _totalIncome: number,
    private readonly _totalExpenses: number,
    private readonly _netCashFlow: number,
    private readonly _transactionCount: number,
    private readonly _averageTransactionSize: number,
    private readonly _largestExpense: number,
    private readonly _largestIncome: number,
    private readonly _categoryCounts: Record<string, number>,
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

  get totalIncome(): number {
    return this._totalIncome;
  }

  get totalExpenses(): number {
    return this._totalExpenses;
  }

  get netCashFlow(): number {
    return this._netCashFlow;
  }

  get transactionCount(): number {
    return this._transactionCount;
  }

  get averageTransactionSize(): number {
    return this._averageTransactionSize;
  }

  get largestExpense(): number {
    return this._largestExpense;
  }

  get largestIncome(): number {
    return this._largestIncome;
  }

  get categoryCounts(): Record<string, number> {
    return { ...this._categoryCounts };
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
   * Factory: Create new monthly summary
   */
  public static create(
    userId: string,
    month: Date,
    totalIncome: number,
    totalExpenses: number,
    transactionCount: number,
    categoryCounts: Record<string, number>,
    options?: {
      averageTransactionSize?: number;
      largestExpense?: number;
      largestIncome?: number;
    }
  ): MonthlySummary {
    // Validations
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!month) {
      throw new Error('Month is required');
    }

    if (totalIncome < 0) {
      throw new Error('Total income cannot be negative');
    }

    if (totalExpenses < 0) {
      throw new Error('Total expenses cannot be negative');
    }

    if (transactionCount < 0) {
      throw new Error('Transaction count cannot be negative');
    }

    // Calculate net cash flow
    const netCashFlow = totalIncome - totalExpenses;

    // Calculate averages and extremes
    const averageTransactionSize =
      options?.averageTransactionSize ??
      (transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0);

    const largestExpense = options?.largestExpense ?? 0;
    const largestIncome = options?.largestIncome ?? 0;

    const now = new Date();

    return new MonthlySummary(
      crypto.randomUUID(),
      userId,
      month,
      totalIncome,
      totalExpenses,
      netCashFlow,
      transactionCount,
      averageTransactionSize,
      largestExpense,
      largestIncome,
      categoryCounts,
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
    totalIncome: number,
    totalExpenses: number,
    netCashFlow: number,
    transactionCount: number,
    averageTransactionSize: number,
    largestExpense: number,
    largestIncome: number,
    categoryCounts: Record<string, number>,
    calculatedAt: Date,
    createdAt: Date,
    updatedAt: Date
  ): MonthlySummary {
    return new MonthlySummary(
      id,
      userId,
      month,
      totalIncome,
      totalExpenses,
      netCashFlow,
      transactionCount,
      averageTransactionSize,
      largestExpense,
      largestIncome,
      categoryCounts,
      calculatedAt,
      createdAt,
      updatedAt
    );
  }

  /**
   * Business Logic: Check if summary is stale (needs recalculation)
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
   * Business Logic: Get savings rate
   */
  public getSavingsRate(): number {
    if (this._totalIncome === 0) return 0;
    return (this._netCashFlow / this._totalIncome) * 100;
  }

  /**
   * Business Logic: Get expense ratio
   */
  public getExpenseRatio(): number {
    if (this._totalIncome === 0) return 0;
    return (this._totalExpenses / this._totalIncome) * 100;
  }

  /**
   * Business Logic: Compare to another month
   */
  public compareTo(other: MonthlySummary): {
    incomeDelta: number;
    expensesDelta: number;
    netCashFlowDelta: number;
    incomePercentChange: number;
    expensesPercentChange: number;
  } {
    const incomeDelta = this._totalIncome - other._totalIncome;
    const expensesDelta = this._totalExpenses - other._totalExpenses;
    const netCashFlowDelta = this._netCashFlow - other._netCashFlow;

    const incomePercentChange =
      other._totalIncome === 0 ? 0 : (incomeDelta / other._totalIncome) * 100;
    const expensesPercentChange =
      other._totalExpenses === 0 ? 0 : (expensesDelta / other._totalExpenses) * 100;

    return {
      incomeDelta,
      expensesDelta,
      netCashFlowDelta,
      incomePercentChange,
      expensesPercentChange,
    };
  }

  /**
   * Update calculated timestamp
   */
  public markAsRecalculated(): void {
    this._calculatedAt = new Date();
  }
}
