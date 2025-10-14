import type { Task as PrismaTask } from '@prisma/client';
import { Task, TaskStatus, TaskPriority } from '@lifeos/core';
import { RecurrencePattern } from '@lifeos/core';

/**
 * Mapper for converting between Prisma models and domain entities.
 *
 * Following Clean Architecture:
 * - Infrastructure layer knows about both Prisma and domain
 * - Domain layer knows nothing about Prisma
 * - This class is the translation layer
 *
 * Design principles:
 * - Single Responsibility: Only does mapping, no business logic
 * - Stateless: All methods are static
 * - Type-safe: Uses proper types from both layers
 */
export class TaskMapper {
  /**
   * Convert Prisma model to domain entity.
   * This is where we hide Prisma implementation details from the domain.
   *
   * @param prismaTask - Prisma Task model
   * @returns Domain Task entity
   */
  static toDomain(prismaTask: PrismaTask): Task {
    // Parse recurrence if present
    let recurrence: RecurrencePattern | undefined;
    if (prismaTask.recurrence) {
      try {
        const recurrenceData = prismaTask.recurrence as Record<string, unknown>;
        recurrence = RecurrencePattern.fromJSON(recurrenceData as Parameters<typeof RecurrencePattern.fromJSON>[0]);
      } catch (error) {
        // Log error but don't fail the whole operation
        console.error('Failed to parse recurrence pattern:', error);
      }
    }

    // Create domain entity
    return new Task({
      id: prismaTask.id,
      title: prismaTask.title,
      description: prismaTask.description,
      type: prismaTask.type,
      status: prismaTask.status as TaskStatus,
      priority: prismaTask.priority as TaskPriority,
      dueDate: prismaTask.dueDate ?? undefined,
      completedAt: prismaTask.completedAt ?? undefined,
      recurrence,
      moduleSource: prismaTask.moduleSource,
      metadata: prismaTask.metadata as Record<string, unknown>,
      tags: prismaTask.tags,
      createdAt: prismaTask.createdAt,
      updatedAt: prismaTask.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma create input.
   * Used when creating new tasks.
   *
   * @param task - Domain Task entity
   * @returns Prisma create input
   */
  static toPrismaCreate(task: Task): Omit<PrismaTask, 'createdAt' | 'updatedAt'> {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
      completedAt: task.completedAt ?? null,
      recurrence: task.recurrence ? task.recurrence.toJSON() : null,
      moduleSource: task.moduleSource,
      metadata: task.metadata as Record<string, unknown>,
      tags: task.tags,
    };
  }

  /**
   * Convert domain entity to Prisma update input.
   * Used when updating existing tasks.
   *
   * @param task - Domain Task entity
   * @returns Prisma update input
   */
  static toPrismaUpdate(task: Task): Partial<PrismaTask> {
    return {
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
      completedAt: task.completedAt ?? null,
      recurrence: task.recurrence ? task.recurrence.toJSON() : null,
      moduleSource: task.moduleSource,
      metadata: task.metadata as Record<string, unknown>,
      tags: task.tags,
    };
  }

  /**
   * Convert array of Prisma models to domain entities.
   *
   * @param prismaTasks - Array of Prisma Task models
   * @returns Array of domain Task entities
   */
  static toDomainList(prismaTasks: PrismaTask[]): Task[] {
    return prismaTasks.map((prismaTask) => this.toDomain(prismaTask));
  }
}
