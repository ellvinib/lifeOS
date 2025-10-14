import type { PrismaClient } from '@prisma/client';
import {
  type ITaskRepository,
  type TaskQueryOptions,
  Task,
  Result,
  NotFoundError,
  DatabaseError,
  type BaseError,
} from '@lifeos/core';

import { DatabaseClient } from '../database/DatabaseClient';
import { TaskMapper } from '../mappers/TaskMapper';

/**
 * Task repository implementation using Prisma ORM.
 *
 * Following Clean Architecture & Repository Pattern:
 * - Implements domain interface (ITaskRepository)
 * - Hides Prisma implementation details
 * - Returns domain entities, not Prisma models
 * - Wraps all errors in Result<T, E>
 * - No business logic (that belongs in use cases)
 * - Transaction support
 *
 * Design principles applied:
 * - Single Responsibility: Only handles data access for tasks
 * - Dependency Inversion: Depends on interface, not implementation
 * - Error handling: Never throws, always returns Result
 * - Separation of Concerns: No business logic, no HTTP concerns
 */
export class TaskRepository implements ITaskRepository {
  /**
   * Prisma client instance.
   * Can be a transaction client or regular client.
   */
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    // Allow injection for transactions, otherwise use singleton
    this.prisma = prismaClient ?? DatabaseClient.getInstance();
  }

  /**
   * Find task by ID.
   * Returns NotFoundError if task doesn't exist.
   */
  async findById(id: string): Promise<Result<Task, BaseError>> {
    try {
      const prismaTask = await this.prisma.task.findUnique({
        where: { id },
      });

      if (!prismaTask) {
        return Result.fail(new NotFoundError('Task', id));
      }

      const task = TaskMapper.toDomain(prismaTask);
      return Result.ok(task);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find task', error as Error, {
          operation: 'findById',
          id,
        })
      );
    }
  }

  /**
   * Find tasks matching query options.
   * Returns empty array if no tasks found.
   */
  async findMany(options: TaskQueryOptions = {}): Promise<Result<Task[], BaseError>> {
    try {
      // Build Prisma where clause from options
      const where = this.buildWhereClause(options);

      // Build orderBy clause
      const orderBy = this.buildOrderByClause(options);

      // Execute query
      const prismaTasks = await this.prisma.task.findMany({
        where,
        orderBy,
        take: options.limit,
        skip: options.offset,
      });

      const tasks = TaskMapper.toDomainList(prismaTasks);
      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find tasks', error as Error, {
          operation: 'findMany',
          options,
        })
      );
    }
  }

  /**
   * Find tasks by module source.
   */
  async findByModule(moduleSource: string): Promise<Result<Task[], BaseError>> {
    return this.findMany({ moduleSource });
  }

  /**
   * Find overdue tasks.
   */
  async findOverdue(): Promise<Result<Task[], BaseError>> {
    return this.findMany({ overdue: true });
  }

  /**
   * Create a new task.
   */
  async create(task: Task): Promise<Result<Task, BaseError>> {
    try {
      const prismaData = TaskMapper.toPrismaCreate(task);

      const createdTask = await this.prisma.task.create({
        data: prismaData,
      });

      const domainTask = TaskMapper.toDomain(createdTask);
      return Result.ok(domainTask);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create task', error as Error, {
          operation: 'create',
          taskId: task.id,
        })
      );
    }
  }

  /**
   * Update an existing task.
   * Returns NotFoundError if task doesn't exist.
   */
  async update(task: Task): Promise<Result<Task, BaseError>> {
    try {
      // Check if task exists first
      const existsResult = await this.exists(task.id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('Task', task.id));
      }

      // Update task
      const prismaData = TaskMapper.toPrismaUpdate(task);

      const updatedTask = await this.prisma.task.update({
        where: { id: task.id },
        data: prismaData,
      });

      const domainTask = TaskMapper.toDomain(updatedTask);
      return Result.ok(domainTask);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to update task', error as Error, {
          operation: 'update',
          taskId: task.id,
        })
      );
    }
  }

  /**
   * Delete a task by ID.
   * Returns NotFoundError if task doesn't exist.
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      // Check if task exists first
      const existsResult = await this.exists(id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('Task', id));
      }

      // Delete task
      await this.prisma.task.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete task', error as Error, {
          operation: 'delete',
          id,
        })
      );
    }
  }

  /**
   * Check if task exists.
   */
  async exists(id: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.task.count({
        where: { id },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check task existence', error as Error, {
          operation: 'exists',
          id,
        })
      );
    }
  }

  /**
   * Count tasks matching query options.
   */
  async count(options: TaskQueryOptions = {}): Promise<Result<number, BaseError>> {
    try {
      const where = this.buildWhereClause(options);

      const count = await this.prisma.task.count({
        where,
      });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count tasks', error as Error, {
          operation: 'count',
          options,
        })
      );
    }
  }

  /**
   * Begin a transaction.
   * Returns new repository instance that uses the transaction.
   */
  async beginTransaction(): Promise<ITaskRepository> {
    // This is a simplified version
    // In production, you'd want a proper transaction manager
    throw new Error('Transaction support not yet implemented');
  }

  /**
   * Commit transaction.
   * Note: With Prisma, transactions are managed differently
   */
  async commit(): Promise<Result<void, BaseError>> {
    throw new Error('Transaction support not yet implemented');
  }

  /**
   * Rollback transaction.
   */
  async rollback(): Promise<Result<void, BaseError>> {
    throw new Error('Transaction support not yet implemented');
  }

  // ========== Private helper methods ==========

  /**
   * Build Prisma where clause from query options.
   * This is where we translate domain queries to Prisma queries.
   */
  private buildWhereClause(options: TaskQueryOptions): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (options.moduleSource) {
      where.moduleSource = options.moduleSource;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.priority) {
      where.priority = options.priority;
    }

    if (options.tags && options.tags.length > 0) {
      // Task must have ALL specified tags
      where.tags = { hasEvery: options.tags };
    }

    // Date range filters
    if (options.dueDateFrom || options.dueDateTo) {
      where.dueDate = {};
      if (options.dueDateFrom) {
        (where.dueDate as Record<string, unknown>).gte = options.dueDateFrom;
      }
      if (options.dueDateTo) {
        (where.dueDate as Record<string, unknown>).lte = options.dueDateTo;
      }
    }

    // Overdue filter
    if (options.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'completed' };
    }

    return where;
  }

  /**
   * Build Prisma orderBy clause from query options.
   */
  private buildOrderByClause(
    options: TaskQueryOptions
  ): Record<string, string> | undefined {
    if (!options.orderBy) {
      return undefined;
    }

    const direction = options.orderDirection ?? 'asc';
    return { [options.orderBy]: direction };
  }
}
