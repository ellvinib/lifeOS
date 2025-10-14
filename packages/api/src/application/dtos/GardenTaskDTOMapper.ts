/**
 * GardenTask DTO Mapper
 *
 * Translates between Domain entities and API DTOs for GardenTask.
 *
 * Design principles:
 * - Single Responsibility: Only handles GardenTask DTO mapping
 * - Pure functions: No side effects
 * - Type-safe: Uses proper TypeScript types
 * - No business logic: Only translation
 */

import {
  GardenTask,
  GardenTaskType,
  Season,
  WeatherDependency,
  TaskStatus,
  TaskPriority,
  type GardenTaskQueryOptions,
} from '@lifeos/core';

import type {
  GardenTaskResponseDTO,
  CreateGardenTaskRequestDTO,
  UpdateGardenTaskRequestDTO,
  GardenTaskQueryRequestDTO,
} from './GardenTaskDTO';

/**
 * GardenTask DTO Mapper.
 *
 * Converts between Domain and DTO representations.
 */
export class GardenTaskDTOMapper {
  /**
   * Convert Domain entity to Response DTO.
   */
  static toResponseDTO(task: GardenTask): GardenTaskResponseDTO {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      areaId: task.areaId,
      plantIds: task.plantIds,
      estimatedDurationMinutes: task.estimatedDurationMinutes,
      weatherDependency: task.weatherDependency,
      idealSeasons: task.idealSeasons,
      dueDate: task.dueDate?.toISOString(),
      scheduledDate: task.scheduledDate?.toISOString(),
      completedDate: task.completedDate?.toISOString(),
      notes: task.notes,
      tools: task.tools,
      materials: task.materials,
      cost: task.cost,
      isRecurring: task.isRecurring,
      recurrenceIntervalDays: task.recurrenceIntervalDays,
      nextRecurrenceDate: task.nextRecurrenceDate?.toISOString(),
      tags: task.tags,
      metadata: task.metadata,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  /**
   * Convert Create Request DTO to Domain entity.
   */
  static fromCreateDTO(dto: CreateGardenTaskRequestDTO): GardenTask {
    return new GardenTask({
      title: dto.title,
      description: dto.description,
      type: dto.type as GardenTaskType,
      status: TaskStatus.PENDING,
      priority: (dto.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      areaId: dto.areaId,
      plantIds: dto.plantIds,
      estimatedDurationMinutes: dto.estimatedDurationMinutes,
      weatherDependency: (dto.weatherDependency as WeatherDependency) ?? WeatherDependency.NONE,
      idealSeasons: dto.idealSeasons?.map((s) => s as Season),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      notes: dto.notes,
      tools: dto.tools,
      materials: dto.materials,
      cost: dto.cost,
      isRecurring: dto.isRecurring ?? false,
      recurrenceIntervalDays: dto.recurrenceIntervalDays,
      tags: dto.tags,
      metadata: dto.metadata,
    });
  }

  /**
   * Apply Update Request DTO to Domain entity.
   */
  static applyUpdateDTO(task: GardenTask, dto: UpdateGardenTaskRequestDTO): void {
    const updateProps: any = {};

    if (dto.title !== undefined) updateProps.title = dto.title;
    if (dto.description !== undefined) updateProps.description = dto.description;
    if (dto.type !== undefined) updateProps.type = dto.type as GardenTaskType;
    if (dto.status !== undefined) updateProps.status = dto.status as TaskStatus;
    if (dto.priority !== undefined) updateProps.priority = dto.priority as TaskPriority;
    if (dto.areaId !== undefined) updateProps.areaId = dto.areaId;
    if (dto.plantIds !== undefined) updateProps.plantIds = dto.plantIds;
    if (dto.estimatedDurationMinutes !== undefined) {
      updateProps.estimatedDurationMinutes = dto.estimatedDurationMinutes;
    }
    if (dto.weatherDependency !== undefined) {
      updateProps.weatherDependency = dto.weatherDependency as WeatherDependency;
    }
    if (dto.idealSeasons !== undefined) {
      updateProps.idealSeasons = dto.idealSeasons.map((s) => s as Season);
    }
    if (dto.dueDate !== undefined) updateProps.dueDate = new Date(dto.dueDate);
    if (dto.scheduledDate !== undefined) updateProps.scheduledDate = new Date(dto.scheduledDate);
    if (dto.completedDate !== undefined) updateProps.completedDate = new Date(dto.completedDate);
    if (dto.notes !== undefined) updateProps.notes = dto.notes;
    if (dto.tools !== undefined) updateProps.tools = dto.tools;
    if (dto.materials !== undefined) updateProps.materials = dto.materials;
    if (dto.cost !== undefined) updateProps.cost = dto.cost;
    if (dto.isRecurring !== undefined) updateProps.isRecurring = dto.isRecurring;
    if (dto.recurrenceIntervalDays !== undefined) {
      updateProps.recurrenceIntervalDays = dto.recurrenceIntervalDays;
    }
    if (dto.nextRecurrenceDate !== undefined) {
      updateProps.nextRecurrenceDate = new Date(dto.nextRecurrenceDate);
    }
    if (dto.tags !== undefined) updateProps.tags = dto.tags;
    if (dto.metadata !== undefined) updateProps.metadata = dto.metadata;

    task.update(updateProps);
  }

  /**
   * Convert Query Request DTO to Repository Query Options.
   */
  static toQueryOptions(dto: GardenTaskQueryRequestDTO): GardenTaskQueryOptions {
    return {
      title: dto.title,
      type: dto.type as GardenTaskType,
      status: dto.status as TaskStatus,
      priority: dto.priority as TaskPriority,
      areaId: dto.areaId,
      plantId: dto.plantId,
      weatherDependency: dto.weatherDependency as WeatherDependency,
      idealSeason: dto.idealSeason as Season,
      isRecurring: dto.isRecurring,
      isOverdue: dto.isOverdue,
      tags: dto.tags,
      dueDateFrom: dto.dueDateFrom ? new Date(dto.dueDateFrom) : undefined,
      dueDateTo: dto.dueDateTo ? new Date(dto.dueDateTo) : undefined,
      limit: dto.limit,
      offset: dto.offset,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }

  /**
   * Convert array of Domain entities to array of Response DTOs.
   */
  static toResponseDTOList(tasks: GardenTask[]): GardenTaskResponseDTO[] {
    return tasks.map((task) => GardenTaskDTOMapper.toResponseDTO(task));
  }
}
