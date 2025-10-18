import { v4 as uuidv4 } from 'uuid';

/**
 * Bill Types
 */
export type BillType = 'electricity' | 'water' | 'gas' | 'internet' | 'phone' | 'subscription' | 'other';

/**
 * Bill Status
 */
export type BillStatus = 'upcoming' | 'paid' | 'overdue' | 'cancelled';

/**
 * Bill Entity Properties
 */
export interface BillProps {
  id: string;
  name: string;
  type: BillType;
  provider: string;
  amount: number;
  isPredicted: boolean;
  predictionConfidence?: number;
  dueDate: Date;
  status: BillStatus;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  accountNumber?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bill Entity
 *
 * Represents a bill or recurring payment with prediction support
 * for utility bills with dynamic pricing.
 *
 * Business Rules:
 * - Amount must be positive
 * - Due date cannot be in the past (for upcoming bills)
 * - Recurring bills must have interval
 * - Predicted bills must have confidence score
 * - Paid bills cannot be marked as upcoming
 */
export class Bill {
  private readonly _id: string;
  private _name: string;
  private _type: BillType;
  private _provider: string;
  private _amount: number;
  private _isPredicted: boolean;
  private _predictionConfidence?: number;
  private _dueDate: Date;
  private _status: BillStatus;
  private _isRecurring: boolean;
  private _recurrenceIntervalDays?: number;
  private _accountNumber?: string;
  private _notes?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: BillProps) {
    this._id = props.id;
    this._name = props.name;
    this._type = props.type;
    this._provider = props.provider;
    this._amount = props.amount;
    this._isPredicted = props.isPredicted;
    this._predictionConfidence = props.predictionConfidence;
    this._dueDate = props.dueDate;
    this._status = props.status;
    this._isRecurring = props.isRecurring;
    this._recurrenceIntervalDays = props.recurrenceIntervalDays;
    this._accountNumber = props.accountNumber;
    this._notes = props.notes;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Bill
   */
  public static create(
    name: string,
    type: BillType,
    provider: string,
    amount: number,
    dueDate: Date,
    options?: {
      isPredicted?: boolean;
      predictionConfidence?: number;
      status?: BillStatus;
      isRecurring?: boolean;
      recurrenceIntervalDays?: number;
      accountNumber?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ): Bill {
    if (amount <= 0) {
      throw new Error('Bill amount must be positive');
    }

    const isPredicted = options?.isPredicted || false;
    if (isPredicted && options?.predictionConfidence === undefined) {
      throw new Error('Predicted bills must have a confidence score');
    }

    if (options?.predictionConfidence !== undefined &&
        (options.predictionConfidence < 0 || options.predictionConfidence > 100)) {
      throw new Error('Prediction confidence must be between 0 and 100');
    }

    const isRecurring = options?.isRecurring || false;
    if (isRecurring && !options?.recurrenceIntervalDays) {
      throw new Error('Recurring bills must have a recurrence interval');
    }

    const now = new Date();
    return new Bill({
      id: uuidv4(),
      name,
      type,
      provider,
      amount,
      isPredicted,
      predictionConfidence: options?.predictionConfidence,
      dueDate,
      status: options?.status || 'upcoming',
      isRecurring,
      recurrenceIntervalDays: options?.recurrenceIntervalDays,
      accountNumber: options?.accountNumber,
      notes: options?.notes,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Bill from persistence
   */
  public static reconstitute(props: BillProps): Bill {
    return new Bill(props);
  }

  /**
   * Mark bill as paid
   */
  public markAsPaid(paidDate: Date): void {
    if (this._status === 'cancelled') {
      throw new Error('Cannot pay a cancelled bill');
    }

    if (this._status === 'paid') {
      throw new Error('Bill is already marked as paid');
    }

    this._status = 'paid';
    this._updatedAt = new Date();

    // For recurring bills, this doesn't clear the isPredicted flag
    // The next occurrence will need to be predicted again
  }

  /**
   * Mark bill as overdue
   */
  public markAsOverdue(): void {
    if (this._status === 'paid' || this._status === 'cancelled') {
      throw new Error(`Cannot mark ${this._status} bill as overdue`);
    }

    this._status = 'overdue';
    this._updatedAt = new Date();
  }

  /**
   * Cancel the bill
   */
  public cancel(): void {
    if (this._status === 'paid') {
      throw new Error('Cannot cancel a paid bill');
    }

    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  /**
   * Update bill amount (e.g., when actual bill arrives)
   */
  public updateAmount(newAmount: number, isPredicted: boolean = false, confidence?: number): void {
    if (newAmount <= 0) {
      throw new Error('Bill amount must be positive');
    }

    if (this._status === 'paid') {
      throw new Error('Cannot update amount of paid bill');
    }

    this._amount = newAmount;
    this._isPredicted = isPredicted;
    this._predictionConfidence = confidence;
    this._updatedAt = new Date();
  }

  /**
   * Update bill details
   */
  public update(updates: {
    name?: string;
    provider?: string;
    dueDate?: Date;
    accountNumber?: string;
    notes?: string;
  }): void {
    if (this._status === 'paid') {
      throw new Error('Cannot update paid bill details');
    }

    if (updates.name !== undefined) this._name = updates.name;
    if (updates.provider !== undefined) this._provider = updates.provider;
    if (updates.dueDate !== undefined) this._dueDate = updates.dueDate;
    if (updates.accountNumber !== undefined) this._accountNumber = updates.accountNumber;
    if (updates.notes !== undefined) this._notes = updates.notes;

    this._updatedAt = new Date();
  }

  /**
   * Check if bill is overdue
   */
  public isOverdue(): boolean {
    if (this._status === 'paid' || this._status === 'cancelled') return false;
    return new Date() > this._dueDate;
  }

  /**
   * Check if bill is due soon (within specified days)
   */
  public isDueSoon(days: number = 7): boolean {
    if (this._status !== 'upcoming') return false;
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + days);
    return this._dueDate <= daysFromNow && this._dueDate >= new Date();
  }

  /**
   * Calculate next occurrence for recurring bills
   */
  public getNextOccurrence(): Bill | null {
    if (!this._isRecurring || !this._recurrenceIntervalDays) return null;

    const nextDueDate = new Date(this._dueDate);
    nextDueDate.setDate(nextDueDate.getDate() + this._recurrenceIntervalDays);

    return Bill.create(
      this._name,
      this._type,
      this._provider,
      this._amount,
      nextDueDate,
      {
        isPredicted: this._isPredicted,
        predictionConfidence: this._predictionConfidence,
        status: 'upcoming',
        isRecurring: true,
        recurrenceIntervalDays: this._recurrenceIntervalDays,
        accountNumber: this._accountNumber,
        notes: this._notes,
        metadata: this._metadata,
      }
    );
  }

  /**
   * Check if prediction confidence is high
   */
  public hasHighConfidence(): boolean {
    if (!this._isPredicted || !this._predictionConfidence) return false;
    return this._predictionConfidence >= 80;
  }

  /**
   * Check if this is a utility bill
   */
  public isUtilityBill(): boolean {
    return ['electricity', 'water', 'gas', 'internet', 'phone'].includes(this._type);
  }

  // Getters
  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get type(): BillType { return this._type; }
  public get provider(): string { return this._provider; }
  public get amount(): number { return this._amount; }
  public get isPredicted(): boolean { return this._isPredicted; }
  public get predictionConfidence(): number | undefined { return this._predictionConfidence; }
  public get dueDate(): Date { return this._dueDate; }
  public get status(): BillStatus { return this._status; }
  public get isRecurring(): boolean { return this._isRecurring; }
  public get recurrenceIntervalDays(): number | undefined { return this._recurrenceIntervalDays; }
  public get accountNumber(): string | undefined { return this._accountNumber; }
  public get notes(): string | undefined { return this._notes; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): BillProps {
    return {
      id: this._id,
      name: this._name,
      type: this._type,
      provider: this._provider,
      amount: this._amount,
      isPredicted: this._isPredicted,
      predictionConfidence: this._predictionConfidence,
      dueDate: this._dueDate,
      status: this._status,
      isRecurring: this._isRecurring,
      recurrenceIntervalDays: this._recurrenceIntervalDays,
      accountNumber: this._accountNumber,
      notes: this._notes,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
