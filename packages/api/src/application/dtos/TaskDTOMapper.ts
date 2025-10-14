import { Task, TaskStatus, TaskPriority, RecurrencePattern } from '@lifeos/core';

import type {
  TaskResponseDTO,
  RecurrenceDTO,
  CreateTaskRequestDTO,
  UpdateTaskRequestDTO,
  TaskQueryRequestDTO,
} from './TaskDTO';
import type { TaskQueryOptions } from '@lifeos/core';

/**
 * Mapper for converting between domain entities and DTOs.
 *
 * Following Single Responsibility Principle:
 * - Only does DTO mapping
 * - No business logic
 * - No validation (that's in validators)
 * - Stateless (all static methods)
 *
 * This is a separate concern from Prisma mapping:
 * - TaskMapper: Prisma model ↔ Domain entity
 * - TaskDTOMapper: Domain entity ↔ DTO
 */
export class TaskDTOMapper {
  /**
   * Convert domain entity to response DTO.
   * This is what we send to clients.
   */
  static toResponseDTO(task: Task): TaskResponseDTO {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      recurrence: task.recurrence ? this.recurrenceToDTO(task.recurrence) : null,
      moduleSource: task.moduleSource,
      metadata: task.metadata,
      tags: task.tags,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  /**
   * Convert recurrence pattern to DTO.
   */
  private static recurrenceToDTO(recurrence: RecurrencePattern): RecurrenceDTO {
    return {
      type: recurrence.type,
      interval: recurrence.interval,
      endDate: recurrence.endDate?.toISOString() ?? null,
      customRule: recurrence.customRule ?? null,
      daysOfWeek: recurrence.daysOfWeek ?? null,
    };
  }

  /**
   * Convert create request DTO to domain entity.
   */
  static fromCreateDTO(dto: CreateTaskRequestDTO): Task {
    return new Task({
      title: dto.title,
      description: dto.description ?? '',
      type: dto.type,
      status: (dto.status as TaskStatus) ?? TaskStatus.PENDING,
      priority: (dto.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      recurrence: dto.recurrence ? this.dtoToRecurrence(dto.recurrence) : undefined,
      moduleSource: dto.moduleSource,
      metadata: dto.metadata ?? {},
      tags: dto.tags ?? [],
    });
  }

  /**
   * Convert DTO to recurrence pattern.
   */
  private static dtoToRecurrence(dto: RecurrenceDTO): RecurrencePattern {
    return RecurrencePattern.fromJSON({
      type: dto.type as Parameters<typeof RecurrencePattern.fromJSON>[0]['type'],
      interval: dto.interval,
      endDate: dto.endDate ?? undefined,
      customRule: dto.customRule ?? undefined,
      daysOfWeek: dto.daysOfWeek as Parameters<typeof RecurrencePattern.fromJSON>[0]['daysOfWeek'],
    });
  }

  /**
   * Apply update DTO to existing task entity.
   * Only updates fields that are present in the DTO.
   */
  static applyUpdateDTO(task: Task, dto: UpdateTaskRequestDTO): void {
    if (dto.title !== undefined) {
      task.updateTitle(dto.title);
    }

    if (dto.description !== undefined) {
      task.updateDescription(dto.description);
    }

    if (dto.status !== undefined) {
      task.changeStatus(dto.status as TaskStatus);
    }

    if (dto.priority !== undefined) {
      task.changePriority(dto.priority as TaskPriority);
    }

    if (dto.dueDate !== undefined) {
      if (dto.dueDate === null) {
        // Clear due date (would need to add method to Task entity)
        // For now, skip
      } else {
        task.setDueDate(new Date(dto.dueDate));
      }
    }

    if (dto.recurrence !== undefined) {
      if (dto.recurrence === null) {
        // Clear recurrence (would need to add method to Task entity)
        // For now, skip
      } else {
        task.setRecurrence(this.dtoToRecurrence(dto.recurrence));
      }
    }

    if (dto.metadata !== undefined) {
      task.updateMetadata(dto.metadata);
    }

    if (dto.tags !== undefined) {
      // Replace all tags
      // Would need to add method to Task entity to replace tags
      // For now, skip
    }
  }

  /**
   * Convert query request DTO to repository query options.
   */
  static toQueryOptions(dto: TaskQueryRequestDTO): TaskQueryOptions {
    return {
      moduleSource: dto.moduleSource,
      status: dto.status as TaskStatus | undefined,
      priority: dto.priority as TaskPriority | undefined,
      tags: dto.tags,
      dueDateFrom: dto.dueDateFrom ? new Date(dto.dueDateFrom) : undefined,
      dueDateTo: dto.dueDateTo ? new Date(dto.dueDateTo) : undefined,
      overdue: dto.overdue,
      limit: dto.limit,
      offset: dto.offset,
      orderBy: dto.orderBy,
      orderDirection: dto.orderDirection,
    };
  }

  /**
   * Convert multiple domain entities to response DTOs.
   */
  static toResponseDTOList(tasks: Task[]): TaskResponseDTO[] {
    return tasks.map((task) => this.toResponseDTO(task));
  }
}
