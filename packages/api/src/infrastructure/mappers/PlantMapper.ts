/**
 * Plant Mapper
 *
 * Translates between Prisma models and Domain entities for Plant.
 *
 * Design principles:
 * - Single Responsibility: Only handles Plant mapping
 * - Pure functions: No side effects
 * - Type-safe: Uses proper TypeScript types
 * - Small file: < 200 lines
 * - No business logic: Only translation
 */

import type { GardenPlant as PrismaPlant } from '@prisma/client';
import {
  Plant,
  PlantProps,
  PlantType,
  GrowthStage,
  SunExposure,
  WateringFrequency,
} from '@lifeos/core';

/**
 * Prisma create input type for Plant.
 */
export interface PrismaPlantCreateInput {
  id?: string;
  name: string;
  scientificName?: string;
  type: string;
  variety?: string;
  location: string;
  areaId?: string;
  plantedDate: Date;
  growthStage: string;
  sunExposure: string;
  wateringFrequency: string;
  lastWatered?: Date;
  lastFertilized?: Date;
  lastPruned?: Date;
  notes?: string;
  imageUrl?: string;
  isActive: boolean;
  harvestDate?: Date;
  expectedHarvestDate?: Date;
  metadata?: object;
}

/**
 * Prisma update input type for Plant.
 */
export interface PrismaPlantUpdateInput {
  name?: string;
  scientificName?: string;
  type?: string;
  variety?: string;
  location?: string;
  areaId?: string;
  growthStage?: string;
  sunExposure?: string;
  wateringFrequency?: string;
  lastWatered?: Date;
  lastFertilized?: Date;
  lastPruned?: Date;
  notes?: string;
  imageUrl?: string;
  isActive?: boolean;
  harvestDate?: Date;
  expectedHarvestDate?: Date;
  metadata?: object;
  updatedAt?: Date;
}

/**
 * Plant mapper.
 *
 * Converts between Prisma and Domain representations.
 */
export class PlantMapper {
  /**
   * Convert Prisma model to Domain entity.
   */
  static toDomain(prismaPlant: PrismaPlant): Plant {
    const props: PlantProps = {
      id: prismaPlant.id,
      name: prismaPlant.name,
      scientificName: prismaPlant.scientificName ?? undefined,
      type: prismaPlant.type as PlantType,
      variety: prismaPlant.variety ?? undefined,
      location: prismaPlant.location,
      areaId: prismaPlant.areaId ?? undefined,
      plantedDate: prismaPlant.plantedDate,
      growthStage: prismaPlant.growthStage as GrowthStage,
      sunExposure: prismaPlant.sunExposure as SunExposure,
      wateringFrequency: prismaPlant.wateringFrequency as WateringFrequency,
      lastWatered: prismaPlant.lastWatered ?? undefined,
      lastFertilized: prismaPlant.lastFertilized ?? undefined,
      lastPruned: prismaPlant.lastPruned ?? undefined,
      notes: prismaPlant.notes || undefined,
      imageUrl: prismaPlant.imageUrl ?? undefined,
      isActive: prismaPlant.isActive,
      harvestDate: prismaPlant.harvestDate ?? undefined,
      expectedHarvestDate: prismaPlant.expectedHarvestDate ?? undefined,
      metadata: (prismaPlant.metadata as Record<string, unknown>) ?? undefined,
      createdAt: prismaPlant.createdAt,
      updatedAt: prismaPlant.updatedAt,
    };

    return new Plant(props);
  }

  /**
   * Convert Domain entity to Prisma create input.
   */
  static toPrismaCreate(plant: Plant): PrismaPlantCreateInput {
    return {
      id: plant.id,
      name: plant.name,
      scientificName: plant.scientificName,
      type: plant.type,
      variety: plant.variety,
      location: plant.location,
      areaId: plant.areaId,
      plantedDate: plant.plantedDate,
      growthStage: plant.growthStage,
      sunExposure: plant.sunExposure,
      wateringFrequency: plant.wateringFrequency,
      lastWatered: plant.lastWatered,
      lastFertilized: plant.lastFertilized,
      lastPruned: plant.lastPruned,
      notes: plant.notes,
      imageUrl: plant.imageUrl,
      isActive: plant.isActive,
      harvestDate: plant.harvestDate,
      expectedHarvestDate: plant.expectedHarvestDate,
      metadata: plant.metadata ?? {},
    };
  }

  /**
   * Convert Domain entity to Prisma update input.
   */
  static toPrismaUpdate(plant: Plant): PrismaPlantUpdateInput {
    return {
      name: plant.name,
      scientificName: plant.scientificName,
      type: plant.type,
      variety: plant.variety,
      location: plant.location,
      areaId: plant.areaId,
      growthStage: plant.growthStage,
      sunExposure: plant.sunExposure,
      wateringFrequency: plant.wateringFrequency,
      lastWatered: plant.lastWatered,
      lastFertilized: plant.lastFertilized,
      lastPruned: plant.lastPruned,
      notes: plant.notes,
      imageUrl: plant.imageUrl,
      isActive: plant.isActive,
      harvestDate: plant.harvestDate,
      expectedHarvestDate: plant.expectedHarvestDate,
      metadata: plant.metadata ?? {},
      updatedAt: new Date(),
    };
  }

  /**
   * Convert array of Prisma models to array of Domain entities.
   */
  static toDomainList(prismaPlants: PrismaPlant[]): Plant[] {
    return prismaPlants.map((plant) => PlantMapper.toDomain(plant));
  }
}
