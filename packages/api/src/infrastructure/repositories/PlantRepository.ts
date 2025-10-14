/**
 * Plant Repository Implementation
 *
 * Implements IPlantRepository using Prisma ORM.
 *
 * Design principles:
 * - Dependency Inversion: Implements domain interface
 * - Single Responsibility: Only data access for Plants
 * - No business logic: That's in use cases
 * - Returns Result type: No exceptions thrown
 * - Uses mapper: Converts Prisma ↔ Domain
 */

import { PrismaClient } from '@prisma/client';
import {
  type IPlantRepository,
  type PlantQueryOptions,
  Plant,
  Result,
  BaseError,
  NotFoundError,
  DatabaseError,
} from '@lifeos/core';

import { DatabaseClient } from '../database/DatabaseClient';
import { PlantMapper } from '../mappers/PlantMapper';

/**
 * Plant repository implementation.
 *
 * All methods return Result<T, E> for explicit error handling.
 * All database errors are caught and converted to Result.fail().
 */
export class PlantRepository implements IPlantRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = DatabaseClient.getInstance();
  }

  /**
   * Find plant by ID.
   */
  async findById(id: string): Promise<Result<Plant, BaseError>> {
    try {
      const prismaPlant = await this.prisma.gardenPlant.findUnique({
        where: { id },
      });

      if (!prismaPlant) {
        return Result.fail(new NotFoundError('Plant', id));
      }

      const plant = PlantMapper.toDomain(prismaPlant);
      return Result.ok(plant);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find plant by ID', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find multiple plants with optional filtering.
   */
  async findMany(options?: PlantQueryOptions): Promise<Result<Plant[], BaseError>> {
    try {
      const where: any = {};

      if (options?.name) {
        where.name = { contains: options.name, mode: 'insensitive' };
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.areaId) {
        where.areaId = options.areaId;
      }

      if (options?.growthStage) {
        where.growthStage = options.growthStage;
      }

      if (options?.wateringFrequency) {
        where.wateringFrequency = options.wateringFrequency;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      const prismaPlants = await this.prisma.gardenPlant.findMany({
        where,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: {
          [options?.sortBy ?? 'createdAt']: options?.sortOrder ?? 'desc',
        },
      });

      const plants = PlantMapper.toDomainList(prismaPlants);
      return Result.ok(plants);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find plants', {
          options,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find plants by garden area.
   */
  async findByAreaId(areaId: string): Promise<Result<Plant[], BaseError>> {
    try {
      const prismaPlants = await this.prisma.gardenPlant.findMany({
        where: { areaId },
        orderBy: { name: 'asc' },
      });

      const plants = PlantMapper.toDomainList(prismaPlants);
      return Result.ok(plants);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find plants by area', {
          areaId,
          originalError: error,
        })
      );
    }
  }

  /**
   * Find plants that need watering.
   * Note: This is a simplified version. In production, the business logic
   * for determining "needs watering" should be in the domain layer or use case.
   */
  async findNeedingWater(): Promise<Result<Plant[], BaseError>> {
    try {
      const prismaPlants = await this.prisma.gardenPlant.findMany({
        where: { isActive: true },
        orderBy: { lastWatered: 'asc' },
      });

      const plants = PlantMapper.toDomainList(prismaPlants);

      // Filter using domain logic
      const plantsNeedingWater = plants.filter((plant) => plant.needsWatering());

      return Result.ok(plantsNeedingWater);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find plants needing water', {
          originalError: error,
        })
      );
    }
  }

  /**
   * Count plants matching query options.
   */
  async count(options?: PlantQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.name) {
        where.name = { contains: options.name, mode: 'insensitive' };
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.areaId) {
        where.areaId = options.areaId;
      }

      if (options?.growthStage) {
        where.growthStage = options.growthStage;
      }

      if (options?.wateringFrequency) {
        where.wateringFrequency = options.wateringFrequency;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      const count = await this.prisma.gardenPlant.count({ where });
      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count plants', {
          options,
          originalError: error,
        })
      );
    }
  }

  /**
   * Create new plant.
   */
  async create(plant: Plant): Promise<Result<Plant, BaseError>> {
    try {
      const createInput = PlantMapper.toPrismaCreate(plant);

      const prismaPlant = await this.prisma.gardenPlant.create({
        data: createInput,
      });

      const createdPlant = PlantMapper.toDomain(prismaPlant);
      return Result.ok(createdPlant);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create plant', {
          plant: plant.toObject(),
          originalError: error,
        })
      );
    }
  }

  /**
   * Update existing plant.
   */
  async update(plant: Plant): Promise<Result<Plant, BaseError>> {
    try {
      // Check if plant exists
      const existsResult = await this.exists(plant.id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('Plant', plant.id));
      }

      const updateInput = PlantMapper.toPrismaUpdate(plant);

      const prismaPlant = await this.prisma.gardenPlant.update({
        where: { id: plant.id },
        data: updateInput,
      });

      const updatedPlant = PlantMapper.toDomain(prismaPlant);
      return Result.ok(updatedPlant);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to update plant', {
          plantId: plant.id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Delete plant by ID.
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      // Check if plant exists
      const existsResult = await this.exists(id);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('Plant', id));
      }

      await this.prisma.gardenPlant.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete plant', {
          id,
          originalError: error,
        })
      );
    }
  }

  /**
   * Check if plant exists by ID.
   */
  async exists(id: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.gardenPlant.count({
        where: { id },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check if plant exists', {
          id,
          originalError: error,
        })
      );
    }
  }
}
