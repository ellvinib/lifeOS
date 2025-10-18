/**
 * Scheduling Request Mapper
 *
 * Maps between Prisma SchedulingRequest model and domain SchedulingRequest entity.
 * Handles conversion of Prisma types to domain value objects.
 *
 * @module Calendar Infrastructure
 */

import { SchedulingRequest as PrismaSchedulingRequest } from '@prisma/client';
import { SchedulingRequest } from '../../domain/entities/SchedulingRequest';
import { FlexibilityScore, Priority, EventCategory, RequestStatus } from '../../domain/value-objects';

/**
 * Mapper for SchedulingRequest entity
 */
export class SchedulingRequestMapper {
  /**
   * Convert Prisma model to domain entity
   *
   * @param prismaRequest - Prisma SchedulingRequest model
   * @returns Domain SchedulingRequest entity
   */
  static toDomain(prismaRequest: PrismaSchedulingRequest): SchedulingRequest {
    return new SchedulingRequest({
      id: prismaRequest.id,
      userId: prismaRequest.userId,
      requestingModule: prismaRequest.requestingModule,
      moduleEntityId: prismaRequest.moduleEntityId || undefined,
      title: prismaRequest.title,
      description: prismaRequest.description || undefined,
      desiredStartTime: prismaRequest.desiredStartTime || undefined,
      desiredEndTime: prismaRequest.desiredEndTime || undefined,
      requiredDuration: prismaRequest.requiredDuration,
      flexibilityScore: new FlexibilityScore(prismaRequest.flexibilityScore),
      priority: prismaRequest.priority as Priority,
      category: prismaRequest.category as EventCategory,
      preferredTimeSlots: prismaRequest.preferredTimeSlots as any || undefined,
      blackoutPeriods: prismaRequest.blackoutPeriods as any || undefined,
      status: prismaRequest.status as RequestStatus,
      scheduledEventId: prismaRequest.scheduledEventId || undefined,
      rejectionReason: prismaRequest.rejectionReason || undefined,
      metadata: prismaRequest.metadata as Record<string, any>,
      createdAt: prismaRequest.createdAt,
      updatedAt: prismaRequest.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma create input
   *
   * @param request - Domain SchedulingRequest entity
   * @returns Prisma create input
   */
  static toPrismaCreate(request: SchedulingRequest): any {
    return {
      id: request.id,
      userId: request.userId,
      requestingModule: request.requestingModule,
      moduleEntityId: request.moduleEntityId || null,
      title: request.title,
      description: request.description || null,
      desiredStartTime: request.desiredStartTime || null,
      desiredEndTime: request.desiredEndTime || null,
      requiredDuration: request.requiredDuration,
      flexibilityScore: request.flexibilityScore.value,
      priority: request.priority,
      category: request.category,
      preferredTimeSlots: request.preferredTimeSlots || null,
      blackoutPeriods: request.blackoutPeriods || null,
      status: request.status,
      scheduledEventId: request.scheduledEventId || null,
      rejectionReason: request.rejectionReason || null,
      metadata: request.metadata,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update input
   *
   * @param request - Domain SchedulingRequest entity
   * @returns Prisma update input
   */
  static toPrismaUpdate(request: SchedulingRequest): any {
    return {
      title: request.title,
      description: request.description || null,
      desiredStartTime: request.desiredStartTime || null,
      desiredEndTime: request.desiredEndTime || null,
      requiredDuration: request.requiredDuration,
      flexibilityScore: request.flexibilityScore.value,
      priority: request.priority,
      category: request.category,
      preferredTimeSlots: request.preferredTimeSlots || null,
      blackoutPeriods: request.blackoutPeriods || null,
      status: request.status,
      scheduledEventId: request.scheduledEventId || null,
      rejectionReason: request.rejectionReason || null,
      metadata: request.metadata,
      updatedAt: new Date(),
    };
  }
}
