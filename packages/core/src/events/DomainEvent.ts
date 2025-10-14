/**
 * Base interface for all domain events in the system.
 * Events represent something that has happened in the domain.
 * They are immutable and should be named in past tense (e.g., TaskCreated, PaymentCompleted).
 */
export interface DomainEvent<T = unknown> {
  /**
   * Unique identifier for this event instance
   */
  readonly id: string;

  /**
   * Type of the event (e.g., "TaskCreated", "PaymentDue")
   * Used for routing and filtering
   */
  readonly type: string;

  /**
   * Module that published this event
   */
  readonly source: string;

  /**
   * When the event occurred
   */
  readonly timestamp: Date;

  /**
   * The actual event data
   */
  readonly payload: T;

  /**
   * Additional metadata about the event
   * (user ID, correlation ID, causation ID, etc.)
   */
  readonly metadata: Record<string, unknown>;

  /**
   * Version of the event schema
   * Useful for event versioning and migrations
   */
  readonly version: number;
}

/**
 * Typed event handler function
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

/**
 * Event subscription configuration
 */
export interface EventSubscription {
  /**
   * Unique ID for this subscription
   */
  readonly id: string;

  /**
   * Event type to listen for
   * Can use wildcards: "Task.*" matches TaskCreated, TaskUpdated, etc.
   */
  readonly eventType: string;

  /**
   * Handler function to call when event is received
   */
  readonly handler: EventHandler;

  /**
   * Module that subscribed
   */
  readonly subscriber: string;

  /**
   * Optional priority (higher = executed first)
   */
  readonly priority?: number;
}

/**
 * Options for event publishing
 */
export interface PublishOptions {
  /**
   * Whether to wait for all handlers to complete
   * If false, handlers run asynchronously (fire-and-forget)
   */
  waitForHandlers?: boolean;

  /**
   * Maximum time to wait for handlers (milliseconds)
   */
  timeout?: number;

  /**
   * Store event in event store for persistence
   */
  persist?: boolean;
}
