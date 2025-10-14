/**
 * Recurrence type for repeating tasks/events
 */
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Day of week for weekly recurrence
 */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Recurrence pattern value object for repeating tasks and events.
 * Immutable and self-validating.
 *
 * Examples:
 * - Every day: new RecurrencePattern('daily', 1)
 * - Every 2 weeks: new RecurrencePattern('weekly', 2)
 * - Every month on the 1st: new RecurrencePattern('monthly', 1)
 * - Custom (cron-like): new RecurrencePattern('custom', 1, undefined, '0 0 * * 1') // Every Monday
 */
export class RecurrencePattern {
  private readonly _type: RecurrenceType;
  private readonly _interval: number;
  private readonly _endDate?: Date;
  private readonly _customRule?: string;
  private readonly _daysOfWeek?: DayOfWeek[];

  constructor(
    type: RecurrenceType,
    interval: number = 1,
    endDate?: Date,
    customRule?: string,
    daysOfWeek?: DayOfWeek[]
  ) {
    // Validate inputs
    if (interval < 1 || !Number.isInteger(interval)) {
      throw new Error('Interval must be a positive integer');
    }

    if (type === 'custom' && !customRule) {
      throw new Error('Custom recurrence type requires a custom rule');
    }

    if (endDate && endDate < new Date()) {
      throw new Error('End date cannot be in the past');
    }

    this._type = type;
    this._interval = interval;
    this._endDate = endDate;
    this._customRule = customRule;
    this._daysOfWeek = daysOfWeek;
  }

  /**
   * Get recurrence type
   */
  get type(): RecurrenceType {
    return this._type;
  }

  /**
   * Get interval (e.g., every 2 days, every 3 weeks)
   */
  get interval(): number {
    return this._interval;
  }

  /**
   * Get end date (if set)
   */
  get endDate(): Date | undefined {
    return this._endDate;
  }

  /**
   * Get custom rule (for 'custom' type)
   */
  get customRule(): string | undefined {
    return this._customRule;
  }

  /**
   * Get days of week (for 'weekly' type)
   */
  get daysOfWeek(): DayOfWeek[] | undefined {
    return this._daysOfWeek;
  }

  /**
   * Calculate the next occurrence after a given date.
   *
   * @param from - Date to calculate from (defaults to now)
   * @returns Next occurrence or undefined if recurrence has ended
   */
  getNextOccurrence(from: Date = new Date()): Date | undefined {
    // Check if recurrence has ended
    if (this._endDate && from >= this._endDate) {
      return undefined;
    }

    let next: Date;

    switch (this._type) {
      case 'once':
        return undefined; // No next occurrence for one-time events

      case 'daily':
        next = new Date(from);
        next.setDate(next.getDate() + this._interval);
        break;

      case 'weekly':
        next = new Date(from);
        next.setDate(next.getDate() + this._interval * 7);
        break;

      case 'monthly':
        next = new Date(from);
        next.setMonth(next.getMonth() + this._interval);
        break;

      case 'yearly':
        next = new Date(from);
        next.setFullYear(next.getFullYear() + this._interval);
        break;

      case 'custom':
        // Custom rules would need a cron parser
        // For now, return undefined (implement with a library like 'cron-parser')
        throw new Error('Custom recurrence patterns not yet implemented');

      default:
        throw new Error(`Unknown recurrence type: ${this._type}`);
    }

    // Check if next occurrence exceeds end date
    if (this._endDate && next > this._endDate) {
      return undefined;
    }

    return next;
  }

  /**
   * Get all occurrences within a date range.
   *
   * @param start - Start of range
   * @param end - End of range
   * @param maxOccurrences - Maximum number of occurrences to return (default 100)
   * @returns Array of dates
   */
  getOccurrences(start: Date, end: Date, maxOccurrences: number = 100): Date[] {
    if (this._type === 'once') {
      return []; // One-time events don't have recurrences
    }

    const occurrences: Date[] = [];
    let current: Date | undefined = start;
    let count = 0;

    while (current && current <= end && count < maxOccurrences) {
      occurrences.push(new Date(current));
      current = this.getNextOccurrence(current);
      count++;
    }

    return occurrences;
  }

  /**
   * Check if this pattern equals another.
   */
  equals(other: RecurrencePattern): boolean {
    return (
      this._type === other._type &&
      this._interval === other._interval &&
      this._endDate?.getTime() === other._endDate?.getTime() &&
      this._customRule === other._customRule
    );
  }

  /**
   * Get human-readable description.
   */
  describe(): string {
    let description: string;

    switch (this._type) {
      case 'once':
        return 'Once';

      case 'daily':
        description = this._interval === 1 ? 'Daily' : `Every ${this._interval} days`;
        break;

      case 'weekly':
        description = this._interval === 1 ? 'Weekly' : `Every ${this._interval} weeks`;
        if (this._daysOfWeek && this._daysOfWeek.length > 0) {
          description += ` on ${this._daysOfWeek.join(', ')}`;
        }
        break;

      case 'monthly':
        description = this._interval === 1 ? 'Monthly' : `Every ${this._interval} months`;
        break;

      case 'yearly':
        description = this._interval === 1 ? 'Yearly' : `Every ${this._interval} years`;
        break;

      case 'custom':
        description = `Custom: ${this._customRule}`;
        break;

      default:
        description = 'Unknown';
    }

    if (this._endDate) {
      description += ` until ${this._endDate.toLocaleDateString()}`;
    }

    return description;
  }

  /**
   * Convert to plain object for serialization.
   */
  toJSON(): {
    type: RecurrenceType;
    interval: number;
    endDate?: string;
    customRule?: string;
    daysOfWeek?: DayOfWeek[];
  } {
    return {
      type: this._type,
      interval: this._interval,
      endDate: this._endDate?.toISOString(),
      customRule: this._customRule,
      daysOfWeek: this._daysOfWeek,
    };
  }

  /**
   * Create RecurrencePattern from plain object.
   */
  static fromJSON(json: {
    type: RecurrenceType;
    interval: number;
    endDate?: string;
    customRule?: string;
    daysOfWeek?: DayOfWeek[];
  }): RecurrencePattern {
    return new RecurrencePattern(
      json.type,
      json.interval,
      json.endDate ? new Date(json.endDate) : undefined,
      json.customRule,
      json.daysOfWeek
    );
  }

  /**
   * Create a one-time (non-recurring) pattern.
   */
  static once(): RecurrencePattern {
    return new RecurrencePattern('once', 1);
  }

  /**
   * Create a daily recurrence pattern.
   */
  static daily(interval: number = 1, endDate?: Date): RecurrencePattern {
    return new RecurrencePattern('daily', interval, endDate);
  }

  /**
   * Create a weekly recurrence pattern.
   */
  static weekly(interval: number = 1, daysOfWeek?: DayOfWeek[], endDate?: Date): RecurrencePattern {
    return new RecurrencePattern('weekly', interval, endDate, undefined, daysOfWeek);
  }

  /**
   * Create a monthly recurrence pattern.
   */
  static monthly(interval: number = 1, endDate?: Date): RecurrencePattern {
    return new RecurrencePattern('monthly', interval, endDate);
  }

  /**
   * Create a yearly recurrence pattern.
   */
  static yearly(interval: number = 1, endDate?: Date): RecurrencePattern {
    return new RecurrencePattern('yearly', interval, endDate);
  }
}
