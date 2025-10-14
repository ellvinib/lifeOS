/**
 * Create Garden Task Use Case
 *
 * Business logic for creating a garden task.
 *
 * Design principles:
 * - Single Responsibility: Only handles garden task creation
 * - Business logic HERE: Validation, rules, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import type {
  IGardenTaskRepository,
  GardenTask,
  EventBus,
  Result,
  BaseError,
} from '@lifeos/core';
import { BusinessRuleError, ValidationError } from '@lifeos/core';

/**
 * Create Garden Task Use Case.
 *
 * Orchestrates task creation with business rule validation and event publishing.
 */
export class CreateGardenTaskUseCase {
  constructor(
    private readonly gardenTaskRepository: IGardenTaskRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param task - Garden task to create
   * @returns Result with created task or error
   */
  async execute(task: GardenTask): Promise<Result<GardenTask, BaseError>> {
    // 1. Validate business rules
    const validationResult = this.validateBusinessRules(task);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 2. Persist task
    const createResult = await this.gardenTaskRepository.create(task);
    if (createResult.isFail()) {
      return createResult;
    }

    const createdTask = createResult.value;

    // 3. Publish domain event
    await this.publishGardenTaskCreatedEvent(createdTask);

    // 4. Return result
    return Result.ok(createdTask);
  }

  /**
   * Validate business rules for garden task creation.
   */
  private validateBusinessRules(task: GardenTask): Result<void, BaseError> {
    const errors: string[] = [];

    // Title validation
    if (task.title.length < 3) {
      errors.push('Task title must be at least 3 characters');
    }

    if (task.title.length > 200) {
      errors.push('Task title must not exceed 200 characters');
    }

    // Due date validation
    if (task.dueDate && task.dueDate < new Date()) {
      errors.push('Due date cannot be in the past');
    }

    // Scheduled date validation
    if (task.scheduledDate && task.scheduledDate < new Date()) {
      errors.push('Scheduled date cannot be in the past');
    }

    // Recurrence validation
    if (task.isRecurring && !task.recurrenceIntervalDays) {
      errors.push('Recurring tasks must have recurrence interval');
    }

    if (task.recurrenceIntervalDays && task.recurrenceIntervalDays < 1) {
      errors.push('Recurrence interval must be at least 1 day');
    }

    // Duration validation
    if (task.estimatedDurationMinutes && task.estimatedDurationMinutes < 1) {
      errors.push('Estimated duration must be at least 1 minute');
    }

    // Cost validation
    if (task.cost !== undefined && task.cost < 0) {
      errors.push('Cost cannot be negative');
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return Result.fail(
        new ValidationError('Garden task validation failed', errors.map((msg) => ({ message: msg })))
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Publish GardenTaskCreated domain event.
   */
  private async publishGardenTaskCreatedEvent(task: GardenTask): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'GardenTaskCreated',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        taskId: task.id,
        title: task.title,
        type: task.type,
        dueDate: task.dueDate,
        areaId: task.areaId,
        plantIds: task.plantIds,
      },
      metadata: {},
      version: 1,
    });
  }
}
