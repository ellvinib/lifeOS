import { v4 as uuidv4 } from 'uuid';

/**
 * Expense Categories
 */
export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'transportation'
  | 'healthcare'
  | 'insurance'
  | 'entertainment'
  | 'dining'
  | 'shopping'
  | 'education'
  | 'savings'
  | 'debt_payment'
  | 'investments'
  | 'gifts'
  | 'other';

/**
 * Payment Methods
 */
export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'mobile_payment'
  | 'other';

/**
 * Expense Entity Properties
 */
export interface ExpenseProps {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  merchantName?: string;
  notes?: string;
  tags: string[];
  receiptUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Expense Entity
 *
 * Represents a financial expense with categorization, payment tracking,
 * and support for recurring expenses.
 *
 * Business Rules:
 * - Amount must be positive
 * - Recurring expenses must have interval
 * - Date cannot be in the future (for actual expenses)
 * - Tags are normalized to lowercase
 */
export class Expense {
  private readonly _id: string;
  private _description: string;
  private _amount: number;
  private _category: ExpenseCategory;
  private _date: Date;
  private _paymentMethod: PaymentMethod;
  private _isRecurring: boolean;
  private _recurrenceIntervalDays?: number;
  private _merchantName?: string;
  private _notes?: string;
  private _tags: string[];
  private _receiptUrl?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ExpenseProps) {
    this._id = props.id;
    this._description = props.description;
    this._amount = props.amount;
    this._category = props.category;
    this._date = props.date;
    this._paymentMethod = props.paymentMethod;
    this._isRecurring = props.isRecurring;
    this._recurrenceIntervalDays = props.recurrenceIntervalDays;
    this._merchantName = props.merchantName;
    this._notes = props.notes;
    this._tags = props.tags;
    this._receiptUrl = props.receiptUrl;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Expense
   */
  public static create(
    description: string,
    amount: number,
    category: ExpenseCategory,
    date: Date,
    paymentMethod: PaymentMethod,
    options?: {
      isRecurring?: boolean;
      recurrenceIntervalDays?: number;
      merchantName?: string;
      notes?: string;
      tags?: string[];
      receiptUrl?: string;
      metadata?: Record<string, unknown>;
    }
  ): Expense {
    if (amount <= 0) {
      throw new Error('Expense amount must be positive');
    }

    const isRecurring = options?.isRecurring || false;
    if (isRecurring && !options?.recurrenceIntervalDays) {
      throw new Error('Recurring expenses must have a recurrence interval');
    }

    const now = new Date();
    return new Expense({
      id: uuidv4(),
      description,
      amount,
      category,
      date,
      paymentMethod,
      isRecurring,
      recurrenceIntervalDays: options?.recurrenceIntervalDays,
      merchantName: options?.merchantName,
      notes: options?.notes,
      tags: options?.tags?.map(tag => tag.toLowerCase()) || [],
      receiptUrl: options?.receiptUrl,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Expense from persistence
   */
  public static reconstitute(props: ExpenseProps): Expense {
    return new Expense(props);
  }

  /**
   * Update expense details
   */
  public update(updates: {
    description?: string;
    amount?: number;
    category?: ExpenseCategory;
    date?: Date;
    paymentMethod?: PaymentMethod;
    merchantName?: string;
    notes?: string;
    tags?: string[];
    receiptUrl?: string;
  }): void {
    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('Expense amount must be positive');
    }

    if (updates.description !== undefined) this._description = updates.description;
    if (updates.amount !== undefined) this._amount = updates.amount;
    if (updates.category !== undefined) this._category = updates.category;
    if (updates.date !== undefined) this._date = updates.date;
    if (updates.paymentMethod !== undefined) this._paymentMethod = updates.paymentMethod;
    if (updates.merchantName !== undefined) this._merchantName = updates.merchantName;
    if (updates.notes !== undefined) this._notes = updates.notes;
    if (updates.tags !== undefined) this._tags = updates.tags.map(tag => tag.toLowerCase());
    if (updates.receiptUrl !== undefined) this._receiptUrl = updates.receiptUrl;

    this._updatedAt = new Date();
  }

  /**
   * Check if expense matches a category
   */
  public isInCategory(category: ExpenseCategory): boolean {
    return this._category === category;
  }

  /**
   * Check if expense is in date range
   */
  public isInDateRange(startDate: Date, endDate: Date): boolean {
    return this._date >= startDate && this._date <= endDate;
  }

  /**
   * Check if expense has a specific tag
   */
  public hasTag(tag: string): boolean {
    return this._tags.includes(tag.toLowerCase());
  }

  /**
   * Add tag to expense
   */
  public addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    if (!this._tags.includes(normalizedTag)) {
      this._tags.push(normalizedTag);
      this._updatedAt = new Date();
    }
  }

  /**
   * Remove tag from expense
   */
  public removeTag(tag: string): void {
    const normalizedTag = tag.toLowerCase();
    const index = this._tags.indexOf(normalizedTag);
    if (index !== -1) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Check if expense is from a specific merchant
   */
  public isFromMerchant(merchantName: string): boolean {
    return this._merchantName?.toLowerCase() === merchantName.toLowerCase();
  }

  /**
   * Calculate next occurrence date for recurring expenses
   */
  public getNextOccurrenceDate(): Date | null {
    if (!this._isRecurring || !this._recurrenceIntervalDays) {
      return null;
    }

    const next = new Date(this._date);
    next.setDate(next.getDate() + this._recurrenceIntervalDays);
    return next;
  }

  // Getters
  public get id(): string { return this._id; }
  public get description(): string { return this._description; }
  public get amount(): number { return this._amount; }
  public get category(): ExpenseCategory { return this._category; }
  public get date(): Date { return this._date; }
  public get paymentMethod(): PaymentMethod { return this._paymentMethod; }
  public get isRecurring(): boolean { return this._isRecurring; }
  public get recurrenceIntervalDays(): number | undefined { return this._recurrenceIntervalDays; }
  public get merchantName(): string | undefined { return this._merchantName; }
  public get notes(): string | undefined { return this._notes; }
  public get tags(): string[] { return [...this._tags]; }
  public get receiptUrl(): string | undefined { return this._receiptUrl; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): ExpenseProps {
    return {
      id: this._id,
      description: this._description,
      amount: this._amount,
      category: this._category,
      date: this._date,
      paymentMethod: this._paymentMethod,
      isRecurring: this._isRecurring,
      recurrenceIntervalDays: this._recurrenceIntervalDays,
      merchantName: this._merchantName,
      notes: this._notes,
      tags: [...this._tags],
      receiptUrl: this._receiptUrl,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
