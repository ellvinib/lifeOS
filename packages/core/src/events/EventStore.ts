import type { DomainEvent } from './DomainEvent';

/**
 * Query options for retrieving events from the store.
 */
export interface EventQuery {
  /**
   * Filter by event types
   */
  types?: string[];

  /**
   * Filter by source module
   */
  sources?: string[];

  /**
   * Filter by time range
   */
  from?: Date;
  to?: Date;

  /**
   * Pagination
   */
  limit?: number;
  offset?: number;

  /**
   * Sort order
   */
  orderBy?: 'asc' | 'desc';
}

/**
 * Event store for persisting domain events.
 * Implements event sourcing pattern for complete audit trail.
 *
 * Features:
 * - Persistent storage of all domain events
 * - Query events by type, source, time range
 * - Event replay capability
 * - Audit trail for compliance
 *
 * Note: This is an in-memory implementation. In production,
 * this should be backed by a database (PostgreSQL, EventStore, etc.)
 */
export class EventStore {
  private events: DomainEvent[] = [];

  /**
   * Save an event to the store.
   *
   * @param event - Event to persist
   */
  async save(event: DomainEvent): Promise<void> {
    // In production, this would write to database
    this.events.push(event);
  }

  /**
   * Query events from the store.
   *
   * @param query - Query parameters
   * @returns Matching events
   */
  async query(query: EventQuery = {}): Promise<DomainEvent[]> {
    let results = [...this.events];

    // Filter by types
    if (query.types && query.types.length > 0) {
      results = results.filter((event) => query.types!.includes(event.type));
    }

    // Filter by sources
    if (query.sources && query.sources.length > 0) {
      results = results.filter((event) => query.sources!.includes(event.source));
    }

    // Filter by time range
    if (query.from) {
      results = results.filter((event) => event.timestamp >= query.from!);
    }
    if (query.to) {
      results = results.filter((event) => event.timestamp <= query.to!);
    }

    // Sort
    const orderMultiplier = query.orderBy === 'desc' ? -1 : 1;
    results.sort(
      (a, b) => (a.timestamp.getTime() - b.timestamp.getTime()) * orderMultiplier
    );

    // Paginate
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get event by ID.
   *
   * @param id - Event ID
   * @returns Event or undefined
   */
  async getById(id: string): Promise<DomainEvent | undefined> {
    return this.events.find((event) => event.id === id);
  }

  /**
   * Get all events for a specific aggregate/entity.
   * Useful for event sourcing where you rebuild state from events.
   *
   * @param aggregateId - ID of the aggregate
   * @returns All events for this aggregate
   */
  async getByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    return this.events.filter(
      (event) => event.metadata.aggregateId === aggregateId
    );
  }

  /**
   * Replay events to rebuild state or migrate data.
   * Calls the provided handler for each event in chronological order.
   *
   * @param handler - Function to call for each event
   * @param query - Optional query to filter events
   */
  async replay(
    handler: (event: DomainEvent) => Promise<void> | void,
    query?: EventQuery
  ): Promise<void> {
    const events = await this.query({ ...query, orderBy: 'asc' });

    for (const event of events) {
      await handler(event);
    }
  }

  /**
   * Get count of events matching query.
   *
   * @param query - Query parameters
   * @returns Count of matching events
   */
  async count(query: EventQuery = {}): Promise<number> {
    const results = await this.query({ ...query, limit: undefined, offset: undefined });
    return results.length;
  }

  /**
   * Clear all events from the store.
   * WARNING: This is destructive and should only be used in tests!
   */
  async clear(): Promise<void> {
    this.events = [];
  }

  /**
   * Get statistics about the event store.
   */
  async getStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySource: Record<string, number>;
    oldestEvent?: Date;
    newestEvent?: Date;
  }> {
    const totalEvents = this.events.length;

    if (totalEvents === 0) {
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySource: {},
      };
    }

    const eventsByType: Record<string, number> = {};
    const eventsBySource: Record<string, number> = {};

    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
      eventsBySource[event.source] = (eventsBySource[event.source] ?? 0) + 1;
    }

    const timestamps = this.events.map((e) => e.timestamp.getTime());
    const oldestEvent = new Date(Math.min(...timestamps));
    const newestEvent = new Date(Math.max(...timestamps));

    return {
      totalEvents,
      eventsByType,
      eventsBySource,
      oldestEvent,
      newestEvent,
    };
  }
}
