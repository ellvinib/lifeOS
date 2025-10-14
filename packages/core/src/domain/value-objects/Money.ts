/**
 * Money value object representing an amount of money in a specific currency.
 * Immutable by design - all operations return new instances.
 *
 * Following DDD principles:
 * - Value object (no identity, compared by value)
 * - Immutable (methods return new instances)
 * - Self-validating (validates on construction)
 */
export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string) {
    // Validate inputs
    if (!Number.isFinite(amount)) {
      throw new Error('Amount must be a finite number');
    }
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a 3-letter ISO code (e.g., EUR, USD)');
    }

    // Round to 2 decimal places for currency precision
    this._amount = Math.round(amount * 100) / 100;
    this._currency = currency.toUpperCase();
  }

  /**
   * Get the amount value
   */
  get amount(): number {
    return this._amount;
  }

  /**
   * Get the currency code
   */
  get currency(): string {
    return this._currency;
  }

  /**
   * Add two money values.
   * Currencies must match.
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract two money values.
   * Currencies must match.
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiply by a factor.
   */
  multiply(factor: number): Money {
    if (!Number.isFinite(factor)) {
      throw new Error('Factor must be a finite number');
    }
    return new Money(this._amount * factor, this._currency);
  }

  /**
   * Divide by a divisor.
   */
  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor === 0) {
      throw new Error('Divisor must be a finite non-zero number');
    }
    return new Money(this._amount / divisor, this._currency);
  }

  /**
   * Check if this money equals another.
   */
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * Check if this money is greater than another.
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  /**
   * Check if this money is less than another.
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount < other._amount;
  }

  /**
   * Check if this money is zero.
   */
  isZero(): boolean {
    return this._amount === 0;
  }

  /**
   * Check if this money is positive (> 0).
   */
  isPositive(): boolean {
    return this._amount > 0;
  }

  /**
   * Format as string with currency symbol.
   *
   * @param locale - Locale for formatting (default: 'en-US')
   */
  format(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
    }).format(this._amount);
  }

  /**
   * Convert to plain object for serialization.
   */
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this._amount,
      currency: this._currency,
    };
  }

  /**
   * Create Money from plain object.
   */
  static fromJSON(json: { amount: number; currency: string }): Money {
    return new Money(json.amount, json.currency);
  }

  /**
   * Create Money with zero amount.
   */
  static zero(currency: string): Money {
    return new Money(0, currency);
  }

  /**
   * Assert that two money values have the same currency.
   */
  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this._currency} and ${other._currency}`
      );
    }
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this._amount} ${this._currency}`;
  }
}
