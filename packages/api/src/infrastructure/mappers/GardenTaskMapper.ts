/**
 * GardenTask Mapper
 *
 * Translates between Prisma models and Domain entities for GardenTask.
 *
 * Design principles:
 * - Single Responsibility: Only handles GardenTask mapping
 * - Pure functions: No side effects
 * - Type-safe: Uses proper TypeScript types
 * - Small file: < 250 lines
 * - No business logic: Only translation
 */

import type { GardenTask as PrismaGardenTask } from '@prisma/client';
import {
  GardenTask,
  GardenTaskProps,
  GardenTaskType,
  Season,
  WeatherDependency,
  TaskStatus,
  TaskPriority,
} from '@lifeos/core';

/**
 * Prisma create input type for GardenTask.
 */
export interface PrismaGardenTaskCreateInput {
  id?: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  areaId?: string;
  plantIds?: string[];
  estimatedDurationMinutes?: number;
  weatherDependency: string;
  idealSeasons?: string[];
  dueDate?: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  nextRecurrenceDate?: Date;
  tags?: string[];
  metadata?: object;
}

/**
 * Prisma update input type for GardenTask.
 */
export interface PrismaGardenTaskUpdateInput {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  areaId?: string;
  plantIds?: string[];
  estimatedDurationMinutes?: number;
  weatherDependency?: string;
  idealSeasons?: string[];
  dueDate?: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  nextRecurrenceDate?: Date;
  tags?: string[];
  metadata?: object;
  updatedAt?: Date;
}

/**
 * GardenTask mapper.
 *
 * Converts between Prisma and Domain representations.
 */
export class GardenTaskMapper {
  /**
   * Convert Prisma model to Domain entity.
   */
  static toDomain(prismaTask: PrismaGardenTask): GardenTask {
    const props: GardenTaskProps = {
      id: prismaTask.id,
      title: prismaTask.title,
      description: prismaTask.description ?? undefined,
      type: prismaTask.type as GardenTaskType,
      status: prismaTask.status as TaskStatus,
      priority: prismaTask.priority as TaskPriority,
      areaId: prismaTask.areaId ?? undefined,
      plantIds: prismaTask.plantIds,
      estimatedDurationMinutes: prismaTask.estimatedDurationMinutes ?? undefined,
      weatherDependency: prismaTask.weatherDependency as WeatherDependency,
      idealSeasons: prismaTask.idealSeasons?.map((s) => s as Season) ?? undefined,
      dueDate: prismaTask.dueDate ?? undefined,
      scheduledDate: prismaTask.scheduledDate ?? undefined,
      completedDate: prismaTask.completedDate ?? undefined,
      notes: prismaTask.notes ?? undefined,
      tools: prismaTask.tools ?? undefined,
      materials: prismaTask.materials ?? undefined,
      cost: prismaTask.cost ?? undefined,
      isRecurring: prismaTask.isRecurring,
      recurrenceIntervalDays: prismaTask.recurrenceIntervalDays ?? undefined,
      nextRecurrenceDate: prismaTask.nextRecurrenceDate ?? undefined,
      tags: prismaTask.tags ?? undefined,
      metadata: (prismaTask.metadata as Record<string, unknown>) ?? undefined,
      createdAt: prismaTask.createdAt,
      updatedAt: prismaTask.updatedAt,
    };

    return new GardenTask(props);
  }

  /**
   * Convert Domain entity to Prisma create input.
   */
  static toPrismaCreate(task: GardenTask): PrismaGardenTaskCreateInput {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      areaId: task.areaId,
      plantIds: task.plantIds ?? [],
      estimatedDurationMinutes: task.estimatedDurationMinutes,
      weatherDependency: task.weatherDependency,
      idealSeasons: task.idealSeasons ?? [],
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate,
      completedDate: task.completedDate,
      notes: task.notes,
      tools: task.tools ?? [],
      materials: task.materials ?? [],
      cost: task.cost,
      isRecurring: task.isRecurring,
      recurrenceIntervalDays: task.recurrenceIntervalDays,
      nextRecurrenceDate: task.nextRecurrenceDate,
      tags: task.tags ?? [],
      metadata: task.metadata ?? {},
    };
  }

  /**
   * Convert Domain entity to Prisma update input.
   */
  static toPrismaUpdate(task: GardenTask): PrismaGardenTaskUpdateInput {
    return {
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      areaId: task.areaId,
      plantIds: task.plantIds ?? [],
      estimatedDurationMinutes: task.estimatedDurationMinutes,
      weatherDependency: task.weatherDependency,
      idealSeasons: task.idealSeasons ?? [],
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate,
      completedDate: task.completedDate,
      notes: task.notes,
      tools: task.tools ?? [],
      materials: task.materials ?? [],
      cost: task.cost,
      isRecurring: task.isRecurring,
      recurrenceIntervalDays: task.recurrenceIntervalDays,
      nextRecurrenceDate: task.nextRecurrenceDate,
      tags: task.tags ?? [],
      metadata: task.metadata ?? {},
      updatedAt: new Date(),
    };
  }

  /**
   * Convert array of Prisma models to array of Domain entities.
   */
  static toDomainList(prismaTasks: PrismaGardenTask[]): GardenTask[] {
    return prismaTasks.map((task) => GardenTaskMapper.toDomain(task));
  }
}
