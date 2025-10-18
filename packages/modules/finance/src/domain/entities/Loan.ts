import { v4 as uuidv4 } from 'uuid';

/**
 * Loan Types
 */
export type LoanType = 'mortgage' | 'auto' | 'student' | 'personal' | 'business' | 'other';

/**
 * Loan Status
 */
export type LoanStatus = 'active' | 'paid_off' | 'defaulted' | 'refinanced';

/**
 * Amortization Schedule Entry
 */
export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  date: Date;
}

/**
 * Loan Entity Properties
 */
export interface LoanProps {
  id: string;
  type: LoanType;
  lenderName: string;
  accountNumber?: string;
  status: LoanStatus;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: Date;
  maturityDate: Date;
  nextPaymentDate?: Date;
  totalInterestPaid: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Loan Entity
 *
 * Represents a loan or mortgage with amortization calculations,
 * payment tracking, and interest calculations.
 *
 * Business Rules:
 * - Principal amount must be positive
 * - Interest rate must be non-negative
 * - Term must be positive
 * - Current balance cannot exceed principal
 * - Payments reduce current balance
 */
export class Loan {
  private readonly _id: string;
  private readonly _type: LoanType;
  private readonly _lenderName: string;
  private readonly _accountNumber?: string;
  private _status: LoanStatus;
  private readonly _principalAmount: number;
  private _currentBalance: number;
  private readonly _interestRate: number;
  private readonly _termMonths: number;
  private readonly _monthlyPayment: number;
  private readonly _startDate: Date;
  private readonly _maturityDate: Date;
  private _nextPaymentDate?: Date;
  private _totalInterestPaid: number;
  private _notes?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: LoanProps) {
    this._id = props.id;
    this._type = props.type;
    this._lenderName = props.lenderName;
    this._accountNumber = props.accountNumber;
    this._status = props.status;
    this._principalAmount = props.principalAmount;
    this._currentBalance = props.currentBalance;
    this._interestRate = props.interestRate;
    this._termMonths = props.termMonths;
    this._monthlyPayment = props.monthlyPayment;
    this._startDate = props.startDate;
    this._maturityDate = props.maturityDate;
    this._nextPaymentDate = props.nextPaymentDate;
    this._totalInterestPaid = props.totalInterestPaid;
    this._notes = props.notes;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Loan
   */
  public static create(
    type: LoanType,
    lenderName: string,
    principalAmount: number,
    interestRate: number,
    termMonths: number,
    startDate: Date,
    options?: {
      accountNumber?: string;
      status?: LoanStatus;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ): Loan {
    if (principalAmount <= 0) {
      throw new Error('Principal amount must be positive');
    }

    if (interestRate < 0) {
      throw new Error('Interest rate cannot be negative');
    }

    if (termMonths <= 0) {
      throw new Error('Loan term must be positive');
    }

    // Calculate monthly payment using loan amortization formula
    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment = monthlyRate === 0
      ? principalAmount / termMonths
      : (principalAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);

    // Calculate maturity date
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + termMonths);

    // Calculate next payment date (usually one month from start)
    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const now = new Date();
    return new Loan({
      id: uuidv4(),
      type,
      lenderName,
      accountNumber: options?.accountNumber,
      status: options?.status || 'active',
      principalAmount,
      currentBalance: principalAmount,
      interestRate,
      termMonths,
      monthlyPayment,
      startDate,
      maturityDate,
      nextPaymentDate,
      totalInterestPaid: 0,
      notes: options?.notes,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Loan from persistence
   */
  public static reconstitute(props: LoanProps): Loan {
    return new Loan(props);
  }

  /**
   * Record a payment on the loan
   */
  public recordPayment(amount: number, paymentDate: Date): void {
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (this._status !== 'active') {
      throw new Error(`Cannot record payment on ${this._status} loan`);
    }

    if (amount > this._currentBalance) {
      throw new Error('Payment amount cannot exceed current balance');
    }

    // Calculate interest and principal portions
    const monthlyRate = this._interestRate / 100 / 12;
    const interestPortion = this._currentBalance * monthlyRate;
    const principalPortion = Math.min(amount - interestPortion, this._currentBalance);

    // Update balances
    this._currentBalance -= principalPortion;
    this._totalInterestPaid += interestPortion;

    // Update next payment date
    if (this._nextPaymentDate) {
      const nextDate = new Date(this._nextPaymentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      this._nextPaymentDate = nextDate;
    }

    // Check if loan is paid off
    if (this._currentBalance <= 0.01) { // Account for floating point rounding
      this._currentBalance = 0;
      this._status = 'paid_off';
      this._nextPaymentDate = undefined;
    }

    this._updatedAt = new Date();
  }

  /**
   * Mark loan as defaulted
   */
  public markAsDefaulted(): void {
    if (this._status === 'paid_off') {
      throw new Error('Cannot default a paid off loan');
    }
    this._status = 'defaulted';
    this._updatedAt = new Date();
  }

  /**
   * Mark loan as refinanced
   */
  public markAsRefinanced(): void {
    if (this._status === 'paid_off') {
      throw new Error('Cannot refinance a paid off loan');
    }
    this._status = 'refinanced';
    this._updatedAt = new Date();
  }

  /**
   * Generate full amortization schedule
   */
  public generateAmortizationSchedule(): AmortizationEntry[] {
    const schedule: AmortizationEntry[] = [];
    const monthlyRate = this._interestRate / 100 / 12;
    let balance = this._principalAmount;

    for (let month = 1; month <= this._termMonths; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = this._monthlyPayment - interestPayment;
      balance -= principalPayment;

      const paymentDate = new Date(this._startDate);
      paymentDate.setMonth(paymentDate.getMonth() + month);

      schedule.push({
        month,
        payment: this._monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance), // Avoid negative balance due to rounding
        date: paymentDate,
      });

      if (balance <= 0) break;
    }

    return schedule;
  }

  /**
   * Calculate remaining months
   */
  public getRemainingMonths(): number {
    if (this._status !== 'active') return 0;

    const now = new Date();
    const monthsElapsed = (now.getFullYear() - this._startDate.getFullYear()) * 12 +
      (now.getMonth() - this._startDate.getMonth());

    return Math.max(0, this._termMonths - monthsElapsed);
  }

  /**
   * Calculate total interest to be paid over life of loan
   */
  public getTotalInterestCost(): number {
    return (this._monthlyPayment * this._termMonths) - this._principalAmount;
  }

  /**
   * Calculate equity (for mortgages)
   */
  public getEquity(propertyValue?: number): number {
    if (!propertyValue || this._type !== 'mortgage') return 0;
    return propertyValue - this._currentBalance;
  }

  /**
   * Check if payment is overdue
   */
  public isPaymentOverdue(): boolean {
    if (!this._nextPaymentDate || this._status !== 'active') return false;
    return new Date() > this._nextPaymentDate;
  }

  /**
   * Calculate payment due within days
   */
  public isDueWithinDays(days: number): boolean {
    if (!this._nextPaymentDate || this._status !== 'active') return false;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return this._nextPaymentDate <= dueDate;
  }

  /**
   * Calculate loan-to-value ratio (for mortgages)
   */
  public getLoanToValueRatio(propertyValue: number): number {
    return (this._currentBalance / propertyValue) * 100;
  }

  // Getters
  public get id(): string { return this._id; }
  public get type(): LoanType { return this._type; }
  public get lenderName(): string { return this._lenderName; }
  public get accountNumber(): string | undefined { return this._accountNumber; }
  public get status(): LoanStatus { return this._status; }
  public get principalAmount(): number { return this._principalAmount; }
  public get currentBalance(): number { return this._currentBalance; }
  public get interestRate(): number { return this._interestRate; }
  public get termMonths(): number { return this._termMonths; }
  public get monthlyPayment(): number { return this._monthlyPayment; }
  public get startDate(): Date { return this._startDate; }
  public get maturityDate(): Date { return this._maturityDate; }
  public get nextPaymentDate(): Date | undefined { return this._nextPaymentDate; }
  public get totalInterestPaid(): number { return this._totalInterestPaid; }
  public get notes(): string | undefined { return this._notes; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): LoanProps {
    return {
      id: this._id,
      type: this._type,
      lenderName: this._lenderName,
      accountNumber: this._accountNumber,
      status: this._status,
      principalAmount: this._principalAmount,
      currentBalance: this._currentBalance,
      interestRate: this._interestRate,
      termMonths: this._termMonths,
      monthlyPayment: this._monthlyPayment,
      startDate: this._startDate,
      maturityDate: this._maturityDate,
      nextPaymentDate: this._nextPaymentDate,
      totalInterestPaid: this._totalInterestPaid,
      notes: this._notes,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
