/**
 * GardenArea DTO Mapper
 *
 * Translates between Domain entities and API DTOs for GardenArea.
 *
 * Design principles:
 * - Single Responsibility: Only handles GardenArea DTO mapping
 * - Pure functions: No side effects
 * - Type-safe: Uses proper TypeScript types
 * - No business logic: Only translation
 */

import {
  GardenArea,
  GardenAreaType,
  type GardenAreaQueryOptions,
} from '@lifeos/core';

import type {
  GardenAreaResponseDTO,
  CreateGardenAreaRequestDTO,
  UpdateGardenAreaRequestDTO,
  GardenAreaQueryRequestDTO,
} from './GardenAreaDTO';

/**
 * GardenArea DTO Mapper.
 *
 * Converts between Domain and DTO representations.
 */
export class GardenAreaDTOMapper {
  /**
   * Convert Domain entity to Response DTO.
   */
  static toResponseDTO(area: GardenArea): GardenAreaResponseDTO {
    return {
      id: area.id,
      name: area.name,
      type: area.type,
      description: area.description,
      sizeSquareMeters: area.sizeSquareMeters,
      location: area.location,
      soilType: area.soilType,
      sunExposureHours: area.sunExposureHours,
      irrigationSystem: area.irrigationSystem,
      lastMaintained: area.lastMaintained?.toISOString(),
      maintenanceFrequencyDays: area.maintenanceFrequencyDays,
      isActive: area.isActive,
      notes: area.notes,
      imageUrl: area.imageUrl,
      needsMaintenance: area.needsMaintenance(),
      daysUntilNextMaintenance: area.daysUntilNextMaintenance(),
      metadata: area.metadata,
      createdAt: area.createdAt.toISOString(),
      updatedAt: area.updatedAt.toISOString(),
    };
  }

  /**
   * Convert Create Request DTO to Domain entity.
   */
  static fromCreateDTO(dto: CreateGardenAreaRequestDTO): GardenArea {
    return new GardenArea({
      name: dto.name,
      type: dto.type as GardenAreaType,
      description: dto.description,
      sizeSquareMeters: dto.sizeSquareMeters,
      location: dto.location,
      soilType: dto.soilType,
      sunExposureHours: dto.sunExposureHours,
      irrigationSystem: dto.irrigationSystem,
      maintenanceFrequencyDays: dto.maintenanceFrequencyDays,
      isActive: true,
      notes: dto.notes,
      imageUrl: dto.imageUrl,
      metadata: dto.metadata,
    });
  }

  /**
   * Apply Update Request DTO to Domain entity.
   */
  static applyUpdateDTO(area: GardenArea, dto: UpdateGardenAreaRequestDTO): void {
    const updateProps: any = {};

    if (dto.name !== undefined) updateProps.name = dto.name;
    if (dto.type !== undefined) updateProps.type = dto.type as GardenAreaType;
    if (dto.description !== undefined) updateProps.description = dto.description;
    if (dto.sizeSquareMeters !== undefined) updateProps.sizeSquareMeters = dto.sizeSquareMeters;
    if (dto.location !== undefined) updateProps.location = dto.location;
    if (dto.soilType !== undefined) updateProps.soilType = dto.soilType;
    if (dto.sunExposureHours !== undefined) updateProps.sunExposureHours = dto.sunExposureHours;
    if (dto.irrigationSystem !== undefined) updateProps.irrigationSystem = dto.irrigationSystem;
    if (dto.maintenanceFrequencyDays !== undefined) {
      updateProps.maintenanceFrequencyDays = dto.maintenanceFrequencyDays;
    }
    if (dto.notes !== undefined) updateProps.notes = dto.notes;
    if (dto.imageUrl !== undefined) updateProps.imageUrl = dto.imageUrl;
    if (dto.metadata !== undefined) updateProps.metadata = dto.metadata;

    area.update(updateProps);

    // Handle isActive separately using domain methods
    if (dto.isActive !== undefined) {
      if (dto.isActive) {
        area.activate();
      } else {
        area.deactivate();
      }
    }
  }

  /**
   * Convert Query Request DTO to Repository Query Options.
   */
  static toQueryOptions(dto: GardenAreaQueryRequestDTO): GardenAreaQueryOptions {
    return {
      name: dto.name,
      type: dto.type as GardenAreaType,
      isActive: dto.isActive,
      needsMaintenance: dto.needsMaintenance,
      limit: dto.limit,
      offset: dto.offset,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }

  /**
   * Convert array of Domain entities to array of Response DTOs.
   */
  static toResponseDTOList(areas: GardenArea[]): GardenAreaResponseDTO[] {
    return areas.map((area) => GardenAreaDTOMapper.toResponseDTO(area));
  }
}
