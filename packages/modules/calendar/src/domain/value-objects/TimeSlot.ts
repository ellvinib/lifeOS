/**
 * Time Slot Value Object
 *
 * Immutable value object representing a time range.
 * Used for event scheduling, conflict detection, and availability checking.
 *
 * @module Calendar
 */

export class TimeSlot {
  private readonly _startTime: Date;
  private readonly _endTime: Date;

  constructor(startTime: Date, endTime: Date) {
    if (endTime <= startTime) {
      throw new Error('End time must be after start time');
    }
    this._startTime = new Date(startTime);
    this._endTime = new Date(endTime);
  }

  get startTime(): Date {
    return new Date(this._startTime);
  }

  get endTime(): Date {
    return new Date(this._endTime);
  }

  duration(): number {
    const diffMs = this._endTime.getTime() - this._startTime.getTime();
    return Math.floor(diffMs / 60000);
  }

  overlaps(other: TimeSlot): boolean {
    return (
      this._startTime < other._endTime &&
      this._endTime > other._startTime
    );
  }

  contains(time: Date): boolean {
    return time >= this._startTime && time <= this._endTime;
  }

  containsSlot(other: TimeSlot): boolean {
    return (
      this._startTime <= other._startTime &&
      this._endTime >= other._endTime
    );
  }

  isAdjacentTo(other: TimeSlot): boolean {
    return (
      this._endTime.getTime() === other._startTime.getTime() ||
      this._startTime.getTime() === other._endTime.getTime()
    );
  }

  gapBetween(other: TimeSlot): number {
    if (this.overlaps(other) || this.isAdjacentTo(other)) {
      return 0;
    }

    const gap = this._endTime < other._startTime
      ? other._startTime.getTime() - this._endTime.getTime()
      : this._startTime.getTime() - other._endTime.getTime();

    return Math.floor(gap / 60000);
  }

  moveBy(minutes: number): TimeSlot {
    const ms = minutes * 60000;
    return new TimeSlot(
      new Date(this._startTime.getTime() + ms),
      new Date(this._endTime.getTime() + ms)
    );
  }

  withDuration(minutes: number): TimeSlot {
    if (minutes <= 0) {
      throw new Error('Duration must be positive');
    }
    const endTime = new Date(this._startTime.getTime() + minutes * 60000);
    return new TimeSlot(this._startTime, endTime);
  }

  equals(other: TimeSlot): boolean {
    return (
      this._startTime.getTime() === other._startTime.getTime() &&
      this._endTime.getTime() === other._endTime.getTime()
    );
  }

  static fromStartAndDuration(startTime: Date, durationMinutes: number): TimeSlot {
    if (durationMinutes <= 0) {
      throw new Error('Duration must be positive');
    }
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    return new TimeSlot(startTime, endTime);
  }
}
