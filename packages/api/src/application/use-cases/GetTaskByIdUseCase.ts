import type { ITaskRepository, Task, BaseError } from '@lifeos/core';
import { Result } from '@lifeos/core';

/**
 * Get Task By ID Use Case.
 *
 * Following Single Responsibility Principle:
 * - Does ONE thing: retrieves a task by ID
 * - No HTTP concerns (that's in controllers)
 * - No database concerns (that's in repositories)
 * - Just coordinates and applies business logic
 *
 * Design principles:
 * - Dependency Injection: Receives repository via constructor
 * - Returns Result<T, E>: No exceptions thrown
 * - Stateless: Can be reused for multiple requests
 * - Testable: Can mock repository
 */
export class GetTaskByIdUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * Execute the use case.
   *
   * @param taskId - Task ID to retrieve
   * @returns Result with task or error
   */
  async execute(taskId: string): Promise<Result<Task, BaseError>> {
    // Business rule: Task ID must not be empty
    if (!taskId || taskId.trim() === '') {
      return Result.fail(
        new Error('Task ID is required') as BaseError
      );
    }

    // Delegate to repository
    return this.taskRepository.findById(taskId);

    // Note: No additional business logic needed for simple retrieval
    // More complex use cases would have additional steps here
  }
}
