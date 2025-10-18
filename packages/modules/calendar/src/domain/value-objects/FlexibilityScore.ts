/**
 * Flexibility Score Value Object
 *
 * Immutable value object representing how flexible an event is for AI rearrangement.
 * Score ranges from 0 (completely inflexible) to 100 (highly flexible).
 *
 * @module Calendar
 */

export class FlexibilityScore {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0 || value > 100) {
      throw new Error('Flexibility score must be between 0 and 100');
    }
    if (!Number.isInteger(value)) {
      throw new Error('Flexibility score must be an integer');
    }
    this._value = value;
  }

  /**
   * Get the numeric value
   */
  get value(): number {
    return this._value;
  }

  /**
   * Can this event be rearranged by AI?
   * Events with score > 50 are candidates for rearrangement
   */
  canBeRearranged(): boolean {
    return this._value > 50;
  }

  /**
   * Is this event highly flexible?
   * Events with score > 75 can be moved more aggressively
   */
  isHighlyFlexible(): boolean {
    return this._value > 75;
  }

  /**
   * Is this event completely inflexible?
   */
  isInflexible(): boolean {
    return this._value === 0;
  }

  /**
   * Static factory methods for common flexibility levels
   */
  static inflexible(): FlexibilityScore {
    return new FlexibilityScore(0);
  }

  static low(): FlexibilityScore {
    return new FlexibilityScore(25);
  }

  static medium(): FlexibilityScore {
    return new FlexibilityScore(50);
  }

  static high(): FlexibilityScore {
    return new FlexibilityScore(75);
  }

  static full(): FlexibilityScore {
    return new FlexibilityScore(100);
  }

  /**
   * Compare with another flexibility score
   */
  equals(other: FlexibilityScore): boolean {
    return this._value === other._value;
  }

  /**
   * Create new score with adjusted value
   */
  increase(amount: number): FlexibilityScore {
    const newValue = Math.min(100, this._value + amount);
    return new FlexibilityScore(newValue);
  }

  decrease(amount: number): FlexibilityScore {
    const newValue = Math.max(0, this._value - amount);
    return new FlexibilityScore(newValue);
  }

  /**
   * Serialize to number for storage
   */
  toNumber(): number {
    return this._value;
  }

  /**
   * Deserialize from number
   */
  static fromNumber(value: number): FlexibilityScore {
    return new FlexibilityScore(value);
  }
}
