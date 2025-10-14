import type { ITaskRepository, Task, BaseError } from '@lifeos/core';
import { Result, ValidationError } from '@lifeos/core';
import type { EventBus, DomainEvent } from '@lifeos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create Task Use Case.
 *
 * This is where business logic lives:
 * - Validates input
 * - Creates domain entity
 * - Persists via repository
 * - Publishes domain events
 * - Returns result
 *
 * Design principles:
 * - Single Responsibility: Only handles task creation
 * - Dependency Injection: Receives dependencies via constructor
 * - No side effects: Explicit about what happens
 * - Testable: Can mock dependencies
 */
export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param task - Task entity to create
   * @returns Result with created task or error
   */
  async execute(task: Task): Promise<Result<Task, BaseError>> {
    // 1. Validate business rules
    const validationResult = this.validateBusinessRules(task);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 2. Persist task
    const createResult = await this.taskRepository.create(task);
    if (createResult.isFail()) {
      return createResult;
    }

    const createdTask = createResult.value;

    // 3. Publish domain event
    // Note: We don't fail the whole operation if event publishing fails
    // Events are best-effort
    await this.publishTaskCreatedEvent(createdTask);

    // 4. Return created task
    return Result.ok(createdTask);
  }

  /**
   * Validate business rules for task creation.
   * This is where domain logic lives - not in controllers!
   */
  private validateBusinessRules(task: Task): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    // Rule: Title must be at least 3 characters
    if (task.title.length < 3) {
      errors.push({
        field: 'title',
        message: 'Title must be at least 3 characters long',
      });
    }

    // Rule: Title must not exceed 200 characters
    if (task.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title must not exceed 200 characters',
      });
    }

    // Rule: Due date must be in the future (if set)
    if (task.dueDate && task.dueDate < new Date()) {
      errors.push({
        field: 'dueDate',
        message: 'Due date must be in the future',
      });
    }

    // Rule: Module source must not be empty
    if (!task.moduleSource || task.moduleSource.trim() === '') {
      errors.push({
        field: 'moduleSource',
        message: 'Module source is required',
      });
    }

    // If any validation errors, return them
    if (errors.length > 0) {
      return Result.fail(new ValidationError('Task validation failed', errors));
    }

    return Result.ok(undefined);
  }

  /**
   * Publish TaskCreated domain event.
   * Other modules can subscribe to this event.
   */
  private async publishTaskCreatedEvent(task: Task): Promise<void> {
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'TaskCreated',
      source: task.moduleSource,
      timestamp: new Date(),
      payload: {
        taskId: task.id,
        title: task.title,
        type: task.type,
        dueDate: task.dueDate?.toISOString(),
        priority: task.priority,
      },
      metadata: {
        userId: 'system', // Would come from auth context
      },
      version: 1,
    };

    try {
      await this.eventBus.publish(event);
    } catch (error) {
      // Log error but don't fail the whole operation
      console.error('Failed to publish TaskCreated event:', error);
    }
  }
}
