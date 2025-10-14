import { v4 as uuidv4 } from 'uuid';

import type {
  DomainEvent,
  EventHandler,
  EventSubscription,
  PublishOptions,
} from './DomainEvent';
import { EventStore } from './EventStore';

/**
 * Central event bus for pub/sub communication between modules.
 * Implements the Observer pattern for loose coupling.
 *
 * Features:
 * - Type-safe event publishing and subscription
 * - Wildcard subscriptions (e.g., "Task.*")
 * - Priority-based handler execution
 * - Event persistence via EventStore
 * - Dead letter queue for failed handlers
 * - Async/sync handler support
 */
export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventStore: EventStore;
  private deadLetterQueue: Array<{ event: DomainEvent; error: Error }> = [];

  constructor(eventStore?: EventStore) {
    this.eventStore = eventStore ?? new EventStore();
  }

  /**
   * Subscribe to events of a specific type.
   * Supports wildcard patterns using * (e.g., "Task.*" matches "TaskCreated", "TaskUpdated").
   *
   * @param eventType - Event type or pattern to subscribe to
   * @param handler - Function to call when event is received
   * @param subscriber - Name of the subscribing module
   * @param priority - Optional priority (higher = executed first)
   * @returns Subscription ID that can be used to unsubscribe
   */
  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    subscriber: string,
    priority: number = 0
  ): string {
    const subscriptionId = uuidv4();

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      subscriber,
      priority,
    };

    const existing = this.subscriptions.get(eventType) ?? [];
    // Insert subscription in priority order (highest first)
    const insertIndex = existing.findIndex((sub) => (sub.priority ?? 0) < priority);
    if (insertIndex === -1) {
      existing.push(subscription);
    } else {
      existing.splice(insertIndex, 0, subscription);
    }

    this.subscriptions.set(eventType, existing);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events.
   *
   * @param subscriptionId - ID returned from subscribe()
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex((sub) => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(eventType);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Publish an event to all matching subscribers.
   *
   * @param event - Event to publish
   * @param options - Publishing options
   */
  async publish<T = unknown>(
    event: DomainEvent<T>,
    options: PublishOptions = {}
  ): Promise<void> {
    const { waitForHandlers = true, timeout = 30000, persist = true } = options;

    // Persist event if requested
    if (persist) {
      await this.eventStore.save(event);
    }

    // Find matching subscriptions
    const matchingSubscriptions = this.getMatchingSubscriptions(event.type);

    if (matchingSubscriptions.length === 0) {
      return;
    }

    // Execute handlers
    const handlerPromises = matchingSubscriptions.map((subscription) =>
      this.executeHandler(subscription, event, timeout)
    );

    if (waitForHandlers) {
      await Promise.all(handlerPromises);
    } else {
      // Fire and forget
      void Promise.all(handlerPromises);
    }
  }

  /**
   * Get all subscriptions for a given event type (including wildcards).
   */
  private getMatchingSubscriptions(eventType: string): EventSubscription[] {
    const matches: EventSubscription[] = [];

    for (const [pattern, subs] of this.subscriptions.entries()) {
      if (this.matchesPattern(eventType, pattern)) {
        matches.push(...subs);
      }
    }

    // Sort by priority (highest first)
    return matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Check if event type matches subscription pattern.
   * Supports wildcard matching with *.
   *
   * @example
   * matchesPattern("TaskCreated", "Task.*") // true
   * matchesPattern("TaskCreated", "Payment.*") // false
   * matchesPattern("TaskCreated", "*") // true
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;

    // Convert wildcard pattern to regex
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);

    return regex.test(eventType);
  }

  /**
   * Execute a single event handler with error handling and timeout.
   */
  private async executeHandler(
    subscription: EventSubscription,
    event: DomainEvent,
    timeout: number
  ): Promise<void> {
    try {
      // Create promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Handler timeout')), timeout);
      });

      // Race handler execution against timeout
      await Promise.race([
        Promise.resolve(subscription.handler(event)),
        timeoutPromise,
      ]);
    } catch (error) {
      // Log error and add to dead letter queue
      console.error(
        `Error in event handler for ${event.type} (subscriber: ${subscription.subscriber}):`,
        error
      );

      this.deadLetterQueue.push({
        event,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Get failed events from the dead letter queue.
   */
  getDeadLetterQueue(): Array<{ event: DomainEvent; error: Error }> {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear the dead letter queue.
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Get all active subscriptions (for debugging).
   */
  getSubscriptions(): Map<string, EventSubscription[]> {
    return new Map(this.subscriptions);
  }

  /**
   * Get number of subscribers for a given event type.
   */
  getSubscriberCount(eventType: string): number {
    return this.getMatchingSubscriptions(eventType).length;
  }
}
