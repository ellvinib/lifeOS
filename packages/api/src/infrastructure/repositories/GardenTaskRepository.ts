/**
 * GardenTask Repository Implementation
 *
 * Implements IGardenTaskRepository using Prisma ORM.
 *
 * Design principles:
 * - Dependency Inversion: Implements domain interface
 * - Single Responsibility: Only data access for GardenTasks
 * - No business logic: That's in use cases
 * - Returns Result type: No exceptions thrown
 * - Uses mapper: Converts Prisma ↔ Domain
 */

import { PrismaClient } from '@prisma/client';
import {
  type IGardenTaskRepository,
  type GardenTaskQueryOptions,
  GardenTask,
  Result,
  BaseError,
  NotFoundError,
  DatabaseError,
} from '@lifeos/core';

import { DatabaseClient } from '../database/DatabaseClient';
import { GardenTaskMapper } from '../mappers/GardenTaskMapper';

/**
 * GardenTask repository implementation.
 *
 * All methods return Result<T, E> for explicit error handling.
 * All database errors are caught and converted to Result.fail().
 */
export class GardenTaskRepository implements IGardenTaskRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = DatabaseClient.getInstance();
  }

  /**
   * Find garden task by ID.
   */
  async findById(id: string): Promise<Result<GardenTask, BaseError>> {
    try {
      const prismaTask = await this.prisma.gardenTask.findUnique({
        where: { id },
      });

      if (!prismaTask) {
        return Result.fail(new NotFoundError('GardenTask', id));
      }

      const task = GardenTaskMapper.toDomain(prismaTask);
      return Result.ok(task);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find garden task by ID', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find multiple garden tasks with optional filtering.
   */
  async findMany(options?: GardenTaskQueryOptions): Promise<Result<GardenTask[], BaseError>> {
    try {
      const where: any = {};

      if (options?.title) {
        where.title = { contains: options.title, mode: 'insensitive' };
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.status) {
        where.status = options.status;
      }

      if (options?.priority) {
        where.priority = options.priority;
      }

      if (options?.areaId) {
        where.areaId = options.areaId;
      }

      if (options?.plantId) {
        where.plantIds = { has: options.plantId };
      }

      if (options?.weatherDependency) {
        where.weatherDependency = options.weatherDependency;
      }

      if (options?.idealSeason) {
        where.idealSeasons = { has: options.idealSeason };
      }

      if (options?.isRecurring !== undefined) {
        where.isRecurring = options.isRecurring;
      }

      if (options?.tags && options.tags.length > 0) {
        where.tags = { hasSome: options.tags };
      }

      if (options?.dueDateFrom || options?.dueDateTo) {
        where.dueDate = {};
        if (options.dueDateFrom) {
          where.dueDate.gte = options.dueDateFrom;
        }
        if (options.dueDateTo) {
          where.dueDate.lte = options.dueDateTo;
        }
      }

      const prismaTasks = await this.prisma.gardenTask.findMany({
        where,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: {
          [options?.sortBy ?? 'createdAt']: options?.sortOrder ?? 'desc',
        },
      });

      const tasks = GardenTaskMapper.toDomainList(prismaTasks);
      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find garden tasks', {
          options,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find tasks by garden area.
   */
  async findByAreaId(areaId: string): Promise<Result<GardenTask[], BaseError>> {
    try {
      const prismaTasks = await this.prisma.gardenTask.findMany({
        where: { areaId },
        orderBy: { dueDate: 'asc' },
      });

      const tasks = GardenTaskMapper.toDomainList(prismaTasks);
      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find tasks by area', {
          areaId,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find tasks by plant.
   */
  async findByPlantId(plantId: string): Promise<Result<GardenTask[], BaseError>> {
    try {
      const prismaTasks = await this.prisma.gardenTask.findMany({
        where: {
          plantIds: { has: plantId },
        },
        orderBy: { dueDate: 'asc' },
      });

      const tasks = GardenTaskMapper.toDomainList(prismaTasks);
      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find tasks by plant', {
          plantId,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find overdue tasks.
   * Note: Business logic for "overdue" is in domain layer.
   */
  async findOverdue(): Promise<Result<GardenTask[], BaseError>> {
    try {
      const prismaTasks = await this.prisma.gardenTask.findMany({
        where: {
          status: { not: 'completed' },
          dueDate: { lt: new Date() },
        },
        orderBy: { dueDate: 'asc' },
      });

      const tasks = GardenTaskMapper.toDomainList(prismaTasks);

      // Additional filtering using domain logic
      const overdueTasks = tasks.filter((task) => task.isOverdue());

      return Result.ok(overdueTasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find overdue tasks', {
          originalError: error,
        })
      );
    }
  }

  /**
   * Find tasks due soon (within X days).
   */
  async findDueSoon(daysAhead: number): Promise<Result<GardenTask[], BaseError>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const prismaTasks = await this.prisma.gardenTask.findMany({
        where: {
          status: { not: 'completed' },
          dueDate: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      const tasks = GardenTaskMapper.toDomainList(prismaTasks);
      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find tasks due soon', {
          daysAhead,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find recurring tasks that need to be scheduled.
   */
  async findRecurringTasksToSchedule(): Promise<Result<GardenTask[], BaseError>> {
    try {
      const prismaTasks = await this.prisma.gardenTask.findMany({
        where: {
          isRecurring: true,
          nextRecurrenceDate: { lte: new Date() },
        },
        orderBy: { nextRecurrenceDate: 'asc' },
      });

      const tasks = GardenTaskMapper.toDomainList(prismaTasks);
      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find recurring tasks to schedule', {
          originalError: error,
        })
      );
    }
  }

  /**
   * Count garden tasks matching query options.
   */
  async count(options?: GardenTaskQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.title) {
        where.title = { contains: options.title, mode: 'insensitive' };
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.status) {
        where.status = options.status;
      }

      if (options?.priority) {
        where.priority = options.priority;
      }

      if (options?.areaId) {
        where.areaId = options.areaId;
      }

      if (options?.plantId) {
        where.plantIds = { has: options.plantId };
      }

      if (options?.isRecurring !== undefined) {
        where.isRecurring = options.isRecurring;
      }

      const count = await this.prisma.gardenTask.count({ where });
      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count garden tasks', {
          options,
          originalError: error,
        })
      );
    }
  }

  /**
   * Create new garden task.
   */
  async create(task: GardenTask): Promise<Result<GardenTask, BaseError>> {
    try {
      const createInput = GardenTaskMapper.toPrismaCreate(task);

      const prismaTask = await this.prisma.gardenTask.create({
        data: createInput,
      });

      const createdTask = GardenTaskMapper.toDomain(prismaTask);
      return Result.ok(createdTask);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create garden task', {
          task: task.toObject(),
          originalError: error,
        })
      );
    }
  }

  /**
   * Update existing garden task.
   */
  async update(task: GardenTask): Promise<Result<GardenTask, BaseError>> {
    try {
      // Check if task exists
      const existsResult = await this.exists(task.id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('GardenTask', task.id));
      }

      const updateInput = GardenTaskMapper.toPrismaUpdate(task);

      const prismaTask = await this.prisma.gardenTask.update({
        where: { id: task.id },
        data: updateInput,
      });

      const updatedTask = GardenTaskMapper.toDomain(prismaTask);
      return Result.ok(updatedTask);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to update garden task', {
          taskId: task.id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Delete garden task by ID.
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      // Check if task exists
      const existsResult = await this.exists(id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('GardenTask', id));
      }

      await this.prisma.gardenTask.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete garden task', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Check if garden task exists by ID.
   */
  async exists(id: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.gardenTask.count({
        where: { id },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check if garden task exists', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Complete task and schedule next occurrence if recurring.
   */
  async completeTask(id: string, completedDate?: Date): Promise<Result<GardenTask, BaseError>> {
    try {
      const findResult = await this.findById(id);
      if (findResult.isFail()) {
        return Result.fail(findResult.error);
      }

      const task = findResult.value;
      task.complete(completedDate);

      return await this.update(task);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to complete garden task', {
          id,
          originalError: error,
        })
      );
    }
  }
}
