/**
 * Scheduling Request Repository Implementation
 *
 * Implements scheduling request persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 *
 * @module Calendar Infrastructure
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeos/core/shared/errors';
import { ISchedulingRequestRepository } from '../../domain/interfaces/ISchedulingRequestRepository';
import { SchedulingRequest } from '../../domain/entities/SchedulingRequest';
import { RequestStatus } from '../../domain/value-objects/CalendarEnums';
import { SchedulingRequestMapper } from '../mappers/SchedulingRequestMapper';

/**
 * Scheduling Request Repository with Prisma
 *
 * Handles all database operations for inter-module scheduling requests.
 */
export class SchedulingRequestRepository implements ISchedulingRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a single request by ID
   */
  async findById(id: string): Promise<Result<SchedulingRequest, BaseError>> {
    try {
      const request = await this.prisma.schedulingRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return Result.fail(new NotFoundError('SchedulingRequest', id));
      }

      return Result.ok(SchedulingRequestMapper.toDomain(request));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find scheduling request', error));
    }
  }

  /**
   * Find all requests for a user
   */
  async findByUserId(userId: string): Promise<Result<SchedulingRequest[], BaseError>> {
    try {
      const requests = await this.prisma.schedulingRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(requests.map(SchedulingRequestMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find scheduling requests by user', error)
      );
    }
  }

  /**
   * Find pending requests awaiting scheduling
   */
  async findPending(userId: string): Promise<Result<SchedulingRequest[], BaseError>> {
    try {
      const requests = await this.prisma.schedulingRequest.findMany({
        where: {
          userId,
          status: 'pending',
        },
        orderBy: { createdAt: 'asc' },
      });

      return Result.ok(requests.map(SchedulingRequestMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find pending requests', error));
    }
  }

  /**
   * Find requests by status
   */
  async findByStatus(
    userId: string,
    status: RequestStatus
  ): Promise<Result<SchedulingRequest[], BaseError>> {
    try {
      const requests = await this.prisma.schedulingRequest.findMany({
        where: {
          userId,
          status,
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(requests.map(SchedulingRequestMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find requests by status', error));
    }
  }

  /**
   * Find requests by requesting module
   */
  async findByModule(
    userId: string,
    requestingModule: string
  ): Promise<Result<SchedulingRequest[], BaseError>> {
    try {
      const requests = await this.prisma.schedulingRequest.findMany({
        where: {
          userId,
          requestingModule,
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(requests.map(SchedulingRequestMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find requests by module', error));
    }
  }

  /**
   * Find requests that resulted in a specific scheduled event
   */
  async findByScheduledEvent(
    scheduledEventId: string
  ): Promise<Result<SchedulingRequest, BaseError>> {
    try {
      const request = await this.prisma.schedulingRequest.findFirst({
        where: {
          scheduledEventId,
        },
      });

      if (!request) {
        return Result.fail(
          new NotFoundError('SchedulingRequest', `event:${scheduledEventId}`)
        );
      }

      return Result.ok(SchedulingRequestMapper.toDomain(request));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find request by scheduled event', error)
      );
    }
  }

  /**
   * Create a new scheduling request
   */
  async create(request: SchedulingRequest): Promise<Result<SchedulingRequest, BaseError>> {
    try {
      const prismaRequest = await this.prisma.schedulingRequest.create({
        data: SchedulingRequestMapper.toPrismaCreate(request),
      });

      return Result.ok(SchedulingRequestMapper.toDomain(prismaRequest));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to create scheduling request', error));
    }
  }

  /**
   * Update an existing scheduling request
   */
  async update(request: SchedulingRequest): Promise<Result<SchedulingRequest, BaseError>> {
    try {
      const prismaRequest = await this.prisma.schedulingRequest.update({
        where: { id: request.id },
        data: SchedulingRequestMapper.toPrismaUpdate(request),
      });

      return Result.ok(SchedulingRequestMapper.toDomain(prismaRequest));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to update scheduling request', error));
    }
  }

  /**
   * Delete a scheduling request
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.schedulingRequest.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete scheduling request', error));
    }
  }
}
