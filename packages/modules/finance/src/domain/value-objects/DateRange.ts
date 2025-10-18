/**
 * DateRange Value Object
 *
 * Represents a period between two dates.
 * Immutable value object for date range operations.
 *
 * Design Pattern: Value Object
 * - Immutable
 * - Equality based on value
 * - No identity
 */
export class DateRange {
  private readonly _startDate: Date;
  private readonly _endDate: Date;

  private constructor(startDate: Date, endDate: Date) {
    if (endDate < startDate) {
      throw new Error('End date must be after or equal to start date');
    }

    this._startDate = new Date(startDate);
    this._endDate = new Date(endDate);
  }

  /**
   * Create a DateRange
   */
  public static create(startDate: Date, endDate: Date): DateRange {
    return new DateRange(startDate, endDate);
  }

  /**
   * Create range for current month
   */
  public static currentMonth(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return new DateRange(start, end);
  }

  /**
   * Create range for previous month
   */
  public static previousMonth(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return new DateRange(start, end);
  }

  /**
   * Create range for current year
   */
  public static currentYear(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return new DateRange(start, end);
  }

  /**
   * Create range for last N days
   */
  public static lastNDays(days: number): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return new DateRange(start, end);
  }

  /**
   * Create range for last N months
   */
  public static lastNMonths(months: number): DateRange {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    return new DateRange(start, end);
  }

  /**
   * Create range for specific month
   */
  public static forMonth(year: number, month: number): DateRange {
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return new DateRange(start, end);
  }

  /**
   * Create range for specific year
   */
  public static forYear(year: number): DateRange {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return new DateRange(start, end);
  }

  /**
   * Check if date is within range
   */
  public contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate;
  }

  /**
   * Check if another range overlaps with this one
   */
  public overlaps(other: DateRange): boolean {
    return this._startDate <= other._endDate && this._endDate >= other._startDate;
  }

  /**
   * Get duration in days
   */
  public getDurationInDays(): number {
    const diffMs = this._endDate.getTime() - this._startDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get duration in months (approximate)
   */
  public getDurationInMonths(): number {
    const yearDiff = this._endDate.getFullYear() - this._startDate.getFullYear();
    const monthDiff = this._endDate.getMonth() - this._startDate.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Get duration in years (approximate)
   */
  public getDurationInYears(): number {
    return this.getDurationInMonths() / 12;
  }

  /**
   * Split range into monthly periods
   */
  public splitByMonth(): DateRange[] {
    const ranges: DateRange[] = [];
    let currentStart = new Date(this._startDate);

    while (currentStart <= this._endDate) {
      const monthEnd = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth() + 1,
        0
      );

      const rangeEnd = monthEnd < this._endDate ? monthEnd : this._endDate;
      ranges.push(new DateRange(currentStart, rangeEnd));

      currentStart = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth() + 1,
        1
      );
    }

    return ranges;
  }

  /**
   * Check if range is in the past
   */
  public isInPast(): boolean {
    return this._endDate < new Date();
  }

  /**
   * Check if range is in the future
   */
  public isInFuture(): boolean {
    return this._startDate > new Date();
  }

  /**
   * Check if range includes today
   */
  public includesNow(): boolean {
    return this.contains(new Date());
  }

  /**
   * Extend range by N days
   */
  public extendByDays(days: number): DateRange {
    const newEnd = new Date(this._endDate);
    newEnd.setDate(newEnd.getDate() + days);
    return new DateRange(this._startDate, newEnd);
  }

  /**
   * Extend range by N months
   */
  public extendByMonths(months: number): DateRange {
    const newEnd = new Date(this._endDate);
    newEnd.setMonth(newEnd.getMonth() + months);
    return new DateRange(this._startDate, newEnd);
  }

  /**
   * Equals comparison
   */
  public equals(other: DateRange): boolean {
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    );
  }

  /**
   * Get start date
   */
  public get startDate(): Date {
    return new Date(this._startDate);
  }

  /**
   * Get end date
   */
  public get endDate(): Date {
    return new Date(this._endDate);
  }

  /**
   * Convert to plain object
   */
  public toObject(): { startDate: Date; endDate: Date } {
    return {
      startDate: new Date(this._startDate),
      endDate: new Date(this._endDate),
    };
  }

  /**
   * String representation
   */
  public toString(): string {
    return `${this._startDate.toISOString().split('T')[0]} to ${this._endDate.toISOString().split('T')[0]}`;
  }
}
