/**
 * Plant DTO Mapper
 *
 * Translates between Domain entities and API DTOs for Plant.
 *
 * Design principles:
 * - Single Responsibility: Only handles Plant DTO mapping
 * - Pure functions: No side effects
 * - Type-safe: Uses proper TypeScript types
 * - No business logic: Only translation
 */

import {
  Plant,
  PlantType,
  GrowthStage,
  SunExposure,
  WateringFrequency,
  type PlantQueryOptions,
} from '@lifeos/core';

import type {
  PlantResponseDTO,
  CreatePlantRequestDTO,
  UpdatePlantRequestDTO,
  PlantQueryRequestDTO,
} from './PlantDTO';

/**
 * Plant DTO Mapper.
 *
 * Converts between Domain and DTO representations.
 */
export class PlantDTOMapper {
  /**
   * Convert Domain entity to Response DTO.
   */
  static toResponseDTO(plant: Plant): PlantResponseDTO {
    return {
      id: plant.id,
      name: plant.name,
      scientificName: plant.scientificName,
      type: plant.type,
      variety: plant.variety,
      location: plant.location,
      areaId: plant.areaId,
      plantedDate: plant.plantedDate.toISOString(),
      growthStage: plant.growthStage,
      sunExposure: plant.sunExposure,
      wateringFrequency: plant.wateringFrequency,
      lastWatered: plant.lastWatered?.toISOString(),
      lastFertilized: plant.lastFertilized?.toISOString(),
      lastPruned: plant.lastPruned?.toISOString(),
      notes: plant.notes,
      imageUrl: plant.imageUrl,
      isActive: plant.isActive,
      harvestDate: plant.harvestDate?.toISOString(),
      expectedHarvestDate: plant.expectedHarvestDate?.toISOString(),
      age: plant.age,
      needsWatering: plant.needsWatering(),
      metadata: plant.metadata,
      createdAt: plant.createdAt.toISOString(),
      updatedAt: plant.updatedAt.toISOString(),
    };
  }

  /**
   * Convert Create Request DTO to Domain entity.
   */
  static fromCreateDTO(dto: CreatePlantRequestDTO): Plant {
    return new Plant({
      name: dto.name,
      scientificName: dto.scientificName,
      type: dto.type as PlantType,
      variety: dto.variety,
      location: dto.location,
      areaId: dto.areaId,
      plantedDate: dto.plantedDate ? new Date(dto.plantedDate) : new Date(),
      growthStage: (dto.growthStage as GrowthStage) ?? GrowthStage.SEED,
      sunExposure: dto.sunExposure as SunExposure,
      wateringFrequency: dto.wateringFrequency as WateringFrequency,
      expectedHarvestDate: dto.expectedHarvestDate ? new Date(dto.expectedHarvestDate) : undefined,
      notes: dto.notes,
      imageUrl: dto.imageUrl,
      isActive: true,
      metadata: dto.metadata,
    });
  }

  /**
   * Apply Update Request DTO to Domain entity.
   */
  static applyUpdateDTO(plant: Plant, dto: UpdatePlantRequestDTO): void {
    const updateProps: any = {};

    if (dto.name !== undefined) updateProps.name = dto.name;
    if (dto.scientificName !== undefined) updateProps.scientificName = dto.scientificName;
    if (dto.type !== undefined) updateProps.type = dto.type as PlantType;
    if (dto.variety !== undefined) updateProps.variety = dto.variety;
    if (dto.location !== undefined) updateProps.location = dto.location;
    if (dto.areaId !== undefined) updateProps.areaId = dto.areaId;
    if (dto.growthStage !== undefined) updateProps.growthStage = dto.growthStage as GrowthStage;
    if (dto.sunExposure !== undefined) updateProps.sunExposure = dto.sunExposure as SunExposure;
    if (dto.wateringFrequency !== undefined) {
      updateProps.wateringFrequency = dto.wateringFrequency as WateringFrequency;
    }
    if (dto.expectedHarvestDate !== undefined) {
      updateProps.expectedHarvestDate = new Date(dto.expectedHarvestDate);
    }
    if (dto.notes !== undefined) updateProps.notes = dto.notes;
    if (dto.imageUrl !== undefined) updateProps.imageUrl = dto.imageUrl;
    if (dto.metadata !== undefined) updateProps.metadata = dto.metadata;

    plant.update(updateProps);

    // Handle isActive separately using domain method
    if (dto.isActive !== undefined && !dto.isActive) {
      plant.deactivate();
    }
  }

  /**
   * Convert Query Request DTO to Repository Query Options.
   */
  static toQueryOptions(dto: PlantQueryRequestDTO): PlantQueryOptions {
    return {
      name: dto.name,
      type: dto.type as PlantType,
      areaId: dto.areaId,
      growthStage: dto.growthStage as GrowthStage,
      wateringFrequency: dto.wateringFrequency as WateringFrequency,
      isActive: dto.isActive,
      needsWatering: dto.needsWatering,
      limit: dto.limit,
      offset: dto.offset,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }

  /**
   * Convert array of Domain entities to array of Response DTOs.
   */
  static toResponseDTOList(plants: Plant[]): PlantResponseDTO[] {
    return plants.map((plant) => PlantDTOMapper.toResponseDTO(plant));
  }
}
