import { DomainEvent } from './DomainEvent';

/**
 * Event Publisher Interface
 *
 * Contract for publishing domain events.
 * Used for dependency injection in use cases and services.
 *
 * Implementations:
 * - EventBus: Full-featured event bus with subscriptions
 * - SimpleEventPublisher: Direct publishing without persistence
 * - TestEventPublisher: Mock for testing
 */
export interface IEventPublisher {
  /**
   * Publish a domain event
   *
   * @param event - Domain event to publish
   * @returns Promise that resolves when event is published
   */
  publish(event: DomainEvent): Promise<void>;
}
