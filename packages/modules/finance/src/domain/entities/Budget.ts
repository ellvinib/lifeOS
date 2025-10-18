import { v4 as uuidv4 } from 'uuid';
import { ExpenseCategory } from './Expense';

/**
 * Budget Category Entry
 */
export interface BudgetCategory {
  category: ExpenseCategory;
  plannedAmount: number;
  spentAmount: number;
}

/**
 * Budget Entity Properties
 */
export interface BudgetProps {
  id: string;
  name: string;
  month: string; // YYYY-MM format
  totalIncome: number;
  categories: BudgetCategory[];
  savingsGoal?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget Entity
 *
 * Represents a monthly budget with income, planned expenses by category,
 * and savings goals.
 *
 * Business Rules:
 * - Total income must be positive
 * - Category planned amounts must be non-negative
 * - Spent amounts must be non-negative
 * - Savings goal must be non-negative
 * - Month must be in YYYY-MM format
 */
export class Budget {
  private readonly _id: string;
  private _name: string;
  private readonly _month: string;
  private _totalIncome: number;
  private _categories: Map<ExpenseCategory, BudgetCategory>;
  private _savingsGoal?: number;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: BudgetProps) {
    this._id = props.id;
    this._name = props.name;
    this._month = props.month;
    this._totalIncome = props.totalIncome;
    this._categories = new Map(
      props.categories.map(cat => [cat.category, cat])
    );
    this._savingsGoal = props.savingsGoal;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Budget
   */
  public static create(
    name: string,
    month: string,
    totalIncome: number,
    categories: Array<{ category: ExpenseCategory; plannedAmount: number }>,
    options?: {
      savingsGoal?: number;
      metadata?: Record<string, unknown>;
    }
  ): Budget {
    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error('Month must be in YYYY-MM format');
    }

    if (totalIncome <= 0) {
      throw new Error('Total income must be positive');
    }

    if (options?.savingsGoal !== undefined && options.savingsGoal < 0) {
      throw new Error('Savings goal cannot be negative');
    }

    // Validate categories
    const budgetCategories: BudgetCategory[] = categories.map(cat => {
      if (cat.plannedAmount < 0) {
        throw new Error(`Planned amount for ${cat.category} cannot be negative`);
      }
      return {
        category: cat.category,
        plannedAmount: cat.plannedAmount,
        spentAmount: 0,
      };
    });

    const now = new Date();
    return new Budget({
      id: uuidv4(),
      name,
      month,
      totalIncome,
      categories: budgetCategories,
      savingsGoal: options?.savingsGoal,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Budget from persistence
   */
  public static reconstitute(props: BudgetProps): Budget {
    return new Budget(props);
  }

  /**
   * Add or update category budget
   */
  public setCategoryBudget(category: ExpenseCategory, plannedAmount: number): void {
    if (plannedAmount < 0) {
      throw new Error('Planned amount cannot be negative');
    }

    const existing = this._categories.get(category);
    this._categories.set(category, {
      category,
      plannedAmount,
      spentAmount: existing?.spentAmount || 0,
    });

    this._updatedAt = new Date();
  }

  /**
   * Record spending in a category
   */
  public recordSpending(category: ExpenseCategory, amount: number): void {
    if (amount <= 0) {
      throw new Error('Spending amount must be positive');
    }

    const categoryBudget = this._categories.get(category);
    if (!categoryBudget) {
      throw new Error(`Category ${category} not found in budget`);
    }

    categoryBudget.spentAmount += amount;
    this._updatedAt = new Date();
  }

  /**
   * Update spent amount for a category (replace, not add)
   */
  public updateSpentAmount(category: ExpenseCategory, spentAmount: number): void {
    if (spentAmount < 0) {
      throw new Error('Spent amount cannot be negative');
    }

    const categoryBudget = this._categories.get(category);
    if (!categoryBudget) {
      throw new Error(`Category ${category} not found in budget`);
    }

    categoryBudget.spentAmount = spentAmount;
    this._updatedAt = new Date();
  }

  /**
   * Remove category from budget
   */
  public removeCategory(category: ExpenseCategory): void {
    this._categories.delete(category);
    this._updatedAt = new Date();
  }

  /**
   * Update budget details
   */
  public update(updates: {
    name?: string;
    totalIncome?: number;
    savingsGoal?: number;
  }): void {
    if (updates.totalIncome !== undefined && updates.totalIncome <= 0) {
      throw new Error('Total income must be positive');
    }

    if (updates.savingsGoal !== undefined && updates.savingsGoal < 0) {
      throw new Error('Savings goal cannot be negative');
    }

    if (updates.name !== undefined) this._name = updates.name;
    if (updates.totalIncome !== undefined) this._totalIncome = updates.totalIncome;
    if (updates.savingsGoal !== undefined) this._savingsGoal = updates.savingsGoal;

    this._updatedAt = new Date();
  }

  /**
   * Get category budget details
   */
  public getCategoryBudget(category: ExpenseCategory): BudgetCategory | undefined {
    return this._categories.get(category);
  }

  /**
   * Get all categories
   */
  public getAllCategories(): BudgetCategory[] {
    return Array.from(this._categories.values());
  }

  /**
   * Calculate total planned spending
   */
  public getTotalPlanned(): number {
    return Array.from(this._categories.values())
      .reduce((sum, cat) => sum + cat.plannedAmount, 0);
  }

  /**
   * Calculate total actual spending
   */
  public getTotalSpent(): number {
    return Array.from(this._categories.values())
      .reduce((sum, cat) => sum + cat.spentAmount, 0);
  }

  /**
   * Calculate remaining budget across all categories
   */
  public getTotalRemaining(): number {
    return this.getTotalPlanned() - this.getTotalSpent();
  }

  /**
   * Calculate actual savings (income - spent)
   */
  public getActualSavings(): number {
    return Math.max(0, this._totalIncome - this.getTotalSpent());
  }

  /**
   * Calculate planned savings (income - planned)
   */
  public getPlannedSavings(): number {
    return Math.max(0, this._totalIncome - this.getTotalPlanned());
  }

  /**
   * Check if budget is exceeded
   */
  public isExceeded(): boolean {
    return this.getTotalSpent() > this.getTotalPlanned();
  }

  /**
   * Check if category budget is exceeded
   */
  public isCategoryExceeded(category: ExpenseCategory): boolean {
    const categoryBudget = this._categories.get(category);
    if (!categoryBudget) return false;
    return categoryBudget.spentAmount > categoryBudget.plannedAmount;
  }

  /**
   * Get exceeded categories
   */
  public getExceededCategories(): ExpenseCategory[] {
    return Array.from(this._categories.values())
      .filter(cat => cat.spentAmount > cat.plannedAmount)
      .map(cat => cat.category);
  }

  /**
   * Check if savings goal is met
   */
  public isSavingsGoalMet(): boolean | null {
    if (!this._savingsGoal) return null;
    return this.getActualSavings() >= this._savingsGoal;
  }

  /**
   * Calculate budget utilization percentage
   */
  public getUtilizationPercentage(): number {
    const totalPlanned = this.getTotalPlanned();
    if (totalPlanned === 0) return 0;
    return (this.getTotalSpent() / totalPlanned) * 100;
  }

  /**
   * Calculate category utilization percentage
   */
  public getCategoryUtilizationPercentage(category: ExpenseCategory): number {
    const categoryBudget = this._categories.get(category);
    if (!categoryBudget || categoryBudget.plannedAmount === 0) return 0;
    return (categoryBudget.spentAmount / categoryBudget.plannedAmount) * 100;
  }

  /**
   * Get categories that are nearly exceeded (>80% spent)
   */
  public getCategoriesNearLimit(): ExpenseCategory[] {
    return Array.from(this._categories.values())
      .filter(cat => {
        if (cat.plannedAmount === 0) return false;
        const utilization = (cat.spentAmount / cat.plannedAmount) * 100;
        return utilization >= 80 && utilization <= 100;
      })
      .map(cat => cat.category);
  }

  // Getters
  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get month(): string { return this._month; }
  public get totalIncome(): number { return this._totalIncome; }
  public get savingsGoal(): number | undefined { return this._savingsGoal; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): BudgetProps {
    return {
      id: this._id,
      name: this._name,
      month: this._month,
      totalIncome: this._totalIncome,
      categories: Array.from(this._categories.values()).map(cat => ({...cat})),
      savingsGoal: this._savingsGoal,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
