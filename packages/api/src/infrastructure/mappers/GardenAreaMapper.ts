/**
 * GardenArea Mapper
 *
 * Translates between Prisma models and Domain entities for GardenArea.
 *
 * Design principles:
 * - Single Responsibility: Only handles GardenArea mapping
 * - Pure functions: No side effects
 * - Type-safe: Uses proper TypeScript types
 * - Small file: < 200 lines
 * - No business logic: Only translation
 */

import type { GardenArea as PrismaGardenArea } from '@prisma/client';
import { GardenArea, GardenAreaProps, GardenAreaType } from '@lifeos/core';

/**
 * Prisma create input type for GardenArea.
 */
export interface PrismaGardenAreaCreateInput {
  id?: string;
  name: string;
  type: string;
  description?: string;
  sizeSquareMeters?: number;
  location: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  lastMaintained?: Date;
  maintenanceFrequencyDays?: number;
  isActive: boolean;
  notes?: string;
  imageUrl?: string;
  metadata?: object;
}

/**
 * Prisma update input type for GardenArea.
 */
export interface PrismaGardenAreaUpdateInput {
  name?: string;
  type?: string;
  description?: string;
  sizeSquareMeters?: number;
  location?: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  lastMaintained?: Date;
  maintenanceFrequencyDays?: number;
  isActive?: boolean;
  notes?: string;
  imageUrl?: string;
  metadata?: object;
  updatedAt?: Date;
}

/**
 * GardenArea mapper.
 *
 * Converts between Prisma and Domain representations.
 */
export class GardenAreaMapper {
  /**
   * Convert Prisma model to Domain entity.
   */
  static toDomain(prismaArea: PrismaGardenArea): GardenArea {
    const props: GardenAreaProps = {
      id: prismaArea.id,
      name: prismaArea.name,
      type: prismaArea.type as GardenAreaType,
      description: prismaArea.description ?? undefined,
      sizeSquareMeters: prismaArea.sizeSquareMeters ?? undefined,
      location: prismaArea.location,
      soilType: prismaArea.soilType ?? undefined,
      sunExposureHours: prismaArea.sunExposureHours ?? undefined,
      irrigationSystem: prismaArea.irrigationSystem ?? undefined,
      lastMaintained: prismaArea.lastMaintained ?? undefined,
      maintenanceFrequencyDays: prismaArea.maintenanceFrequencyDays ?? undefined,
      isActive: prismaArea.isActive,
      notes: prismaArea.notes || undefined,
      imageUrl: prismaArea.imageUrl ?? undefined,
      metadata: (prismaArea.metadata as Record<string, unknown>) ?? undefined,
      createdAt: prismaArea.createdAt,
      updatedAt: prismaArea.updatedAt,
    };

    return new GardenArea(props);
  }

  /**
   * Convert Domain entity to Prisma create input.
   */
  static toPrismaCreate(area: GardenArea): PrismaGardenAreaCreateInput {
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
      lastMaintained: area.lastMaintained,
      maintenanceFrequencyDays: area.maintenanceFrequencyDays,
      isActive: area.isActive,
      notes: area.notes,
      imageUrl: area.imageUrl,
      metadata: area.metadata ?? {},
    };
  }

  /**
   * Convert Domain entity to Prisma update input.
   */
  static toPrismaUpdate(area: GardenArea): PrismaGardenAreaUpdateInput {
    return {
      name: area.name,
      type: area.type,
      description: area.description,
      sizeSquareMeters: area.sizeSquareMeters,
      location: area.location,
      soilType: area.soilType,
      sunExposureHours: area.sunExposureHours,
      irrigationSystem: area.irrigationSystem,
      lastMaintained: area.lastMaintained,
      maintenanceFrequencyDays: area.maintenanceFrequencyDays,
      isActive: area.isActive,
      notes: area.notes,
      imageUrl: area.imageUrl,
      metadata: area.metadata ?? {},
      updatedAt: new Date(),
    };
  }

  /**
   * Convert array of Prisma models to array of Domain entities.
   */
  static toDomainList(prismaAreas: PrismaGardenArea[]): GardenArea[] {
    return prismaAreas.map((area) => GardenAreaMapper.toDomain(area));
  }
}
