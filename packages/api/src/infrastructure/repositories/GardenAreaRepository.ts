/**
 * GardenArea Repository Implementation
 *
 * Implements IGardenAreaRepository using Prisma ORM.
 *
 * Design principles:
 * - Dependency Inversion: Implements domain interface
 * - Single Responsibility: Only data access for GardenAreas
 * - No business logic: That's in use cases
 * - Returns Result type: No exceptions thrown
 * - Uses mapper: Converts Prisma ↔ Domain
 */

import { PrismaClient } from '@prisma/client';
import {
  type IGardenAreaRepository,
  type GardenAreaQueryOptions,
  GardenArea,
  GardenAreaType,
  Result,
  BaseError,
  NotFoundError,
  DatabaseError,
} from '@lifeos/core';

import { DatabaseClient } from '../database/DatabaseClient';
import { GardenAreaMapper } from '../mappers/GardenAreaMapper';

/**
 * GardenArea repository implementation.
 *
 * All methods return Result<T, E> for explicit error handling.
 * All database errors are caught and converted to Result.fail().
 */
export class GardenAreaRepository implements IGardenAreaRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = DatabaseClient.getInstance();
  }

  /**
   * Find garden area by ID.
   */
  async findById(id: string): Promise<Result<GardenArea, BaseError>> {
    try {
      const prismaArea = await this.prisma.gardenArea.findUnique({
        where: { id },
      });

      if (!prismaArea) {
        return Result.fail(new NotFoundError('GardenArea', id));
      }

      const area = GardenAreaMapper.toDomain(prismaArea);
      return Result.ok(area);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find garden area by ID', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find multiple garden areas with optional filtering.
   */
  async findMany(options?: GardenAreaQueryOptions): Promise<Result<GardenArea[], BaseError>> {
    try {
      const where: any = {};

      if (options?.name) {
        where.name = { contains: options.name, mode: 'insensitive' };
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      const prismaAreas = await this.prisma.gardenArea.findMany({
        where,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: {
          [options?.sortBy ?? 'createdAt']: options?.sortOrder ?? 'desc',
        },
      });

      const areas = GardenAreaMapper.toDomainList(prismaAreas);
      return Result.ok(areas);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find garden areas', {
          options,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find areas that need maintenance.
   * Note: Business logic for determining "needs maintenance" is in domain layer.
   */
  async findNeedingMaintenance(): Promise<Result<GardenArea[], BaseError>> {
    try {
      const prismaAreas = await this.prisma.gardenArea.findMany({
        where: { isActive: true },
        orderBy: { lastMaintained: 'asc' },
      });

      const areas = GardenAreaMapper.toDomainList(prismaAreas);

      // Filter using domain logic
      const areasNeedingMaintenance = areas.filter((area) => area.needsMaintenance());

      return Result.ok(areasNeedingMaintenance);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find areas needing maintenance', {
          originalError: error,
        })
      );
    }
  }

  /**
   * Find areas by type.
   */
  async findByType(type: GardenAreaType): Promise<Result<GardenArea[], BaseError>> {
    try {
      const prismaAreas = await this.prisma.gardenArea.findMany({
        where: { type },
        orderBy: { name: 'asc' },
      });

      const areas = GardenAreaMapper.toDomainList(prismaAreas);
      return Result.ok(areas);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find areas by type', {
          type,
          originalError: error,
        })
      );
    }
  }

  /**
   * Count garden areas matching query options.
   */
  async count(options?: GardenAreaQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.name) {
        where.name = { contains: options.name, mode: 'insensitive' };
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      const count = await this.prisma.gardenArea.count({ where });
      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count garden areas', {
          options,
          originalError: error,
        })
      );
    }
  }

  /**
   * Create new garden area.
   */
  async create(area: GardenArea): Promise<Result<GardenArea, BaseError>> {
    try {
      const createInput = GardenAreaMapper.toPrismaCreate(area);

      const prismaArea = await this.prisma.gardenArea.create({
        data: createInput,
      });

      const createdArea = GardenAreaMapper.toDomain(prismaArea);
      return Result.ok(createdArea);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create garden area', {
          area: area.toObject(),
          originalError: error,
        })
      );
    }
  }

  /**
   * Update existing garden area.
   */
  async update(area: GardenArea): Promise<Result<GardenArea, BaseError>> {
    try {
      // Check if area exists
      const existsResult = await this.exists(area.id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('GardenArea', area.id));
      }

      const updateInput = GardenAreaMapper.toPrismaUpdate(area);

      const prismaArea = await this.prisma.gardenArea.update({
        where: { id: area.id },
        data: updateInput,
      });

      const updatedArea = GardenAreaMapper.toDomain(prismaArea);
      return Result.ok(updatedArea);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to update garden area', {
          areaId: area.id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Delete garden area by ID.
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      // Check if area exists
      const existsResult = await this.exists(id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('GardenArea', id));
      }

      await this.prisma.gardenArea.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete garden area', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Check if garden area exists by ID.
   */
  async exists(id: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.gardenArea.count({
        where: { id },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check if garden area exists', {
          id,
          originalError: error,
        })
      );
    }
  }
}
