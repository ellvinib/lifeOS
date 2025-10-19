/**
 * Money Value Object
 *
 * Represents a monetary amount with currency.
 * Immutable value object that handles currency conversion and arithmetic.
 *
 * Design Pattern: Value Object
 * - Immutable
 * - Equality based on value
 * - No identity
 */
export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  private constructor(amount: number, currency: string = 'USD') {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }

    if (!currency || currency.trim().length === 0) {
      throw new Error('Currency must be specified');
    }

    // Round to 2 decimal places for currency precision
    this._amount = Math.round(amount * 100) / 100;
    this._currency = currency.toUpperCase();
  }

  /**
   * Create a Money instance
   */
  public static create(amount: number, currency: string = 'USD'): Money {
    return new Money(amount, currency);
  }

  /**
   * Create zero money
   */
  public static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }

  /**
   * Add two Money instances
   */
  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract two Money instances
   */
  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this._amount - other._amount;

    if (result < 0) {
      throw new Error('Subtraction would result in negative amount');
    }

    return new Money(result, this._currency);
  }

  /**
   * Multiply by a scalar
   */
  public multiply(multiplier: number): Money {
    if (multiplier < 0) {
      throw new Error('Multiplier cannot be negative');
    }
    return new Money(this._amount * multiplier, this._currency);
  }

  /**
   * Divide by a scalar
   */
  public divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Divisor must be positive');
    }
    return new Money(this._amount / divisor, this._currency);
  }

  /**
   * Calculate percentage
   */
  public percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  /**
   * Allocate money proportionally
   */
  public allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      throw new Error('At least one ratio must be provided');
    }

    if (ratios.some(r => r < 0)) {
      throw new Error('Ratios cannot be negative');
    }

    const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (total === 0) {
      throw new Error('Sum of ratios must be greater than zero');
    }

    const results: Money[] = [];
    let remainder = this._amount;

    for (let i = 0; i < ratios.length; i++) {
      const isLast = i === ratios.length - 1;

      if (isLast) {
        // Last allocation gets the remainder to handle rounding
        results.push(new Money(remainder, this._currency));
      } else {
        const share = Math.floor((this._amount * ratios[i] / total) * 100) / 100;
        results.push(new Money(share, this._currency));
        remainder -= share;
      }
    }

    return results;
  }

  /**
   * Compare if equal
   */
  public equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * Compare if greater than
   */
  public isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  /**
   * Compare if less than
   */
  public isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  /**
   * Compare if greater than or equal
   */
  public isGreaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount >= other._amount;
  }

  /**
   * Compare if less than or equal
   */
  public isLessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount <= other._amount;
  }

  /**
   * Check if amount is zero
   */
  public isZero(): boolean {
    return this._amount === 0;
  }

  /**
   * Check if amount is positive
   */
  public isPositive(): boolean {
    return this._amount > 0;
  }

  /**
   * Format as currency string
   */
  public format(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
    }).format(this._amount);
  }

  /**
   * Get plain amount (for calculations or storage)
   */
  public get amount(): number {
    return this._amount;
  }

  /**
   * Get currency code
   */
  public get currency(): string {
    return this._currency;
  }

  /**
   * Ensure two Money instances have the same currency
   */
  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }

  /**
   * Convert to plain object
   */
  public toObject(): { amount: number; currency: string } {
    return {
      amount: this._amount,
      currency: this._currency,
    };
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.format();
  }
}
