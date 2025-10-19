/**
 * AdvertisingCampaign Mapper
 *
 * Translates between Prisma models and domain entities.
 * Follows single responsibility principle.
 *
 * @module Finance
 */

import { AdvertisingCampaign as PrismaAdvertisingCampaign } from '@prisma/client';
import { AdvertisingCampaign } from '../../domain/entities/AdvertisingCampaign';
import { Platform, CampaignStatus } from '../../domain/value-objects/AdvertisingEnums';

/**
 * Maps between Prisma AdvertisingCampaign model and domain entity
 */
export class AdvertisingCampaignMapper {
  /**
   * Convert Prisma model to domain entity
   *
   * @param prismaModel - Prisma AdvertisingCampaign model
   * @returns Domain AdvertisingCampaign entity
   */
  static toDomain(prismaModel: PrismaAdvertisingCampaign): AdvertisingCampaign {
    return new AdvertisingCampaign({
      id: prismaModel.id,
      name: prismaModel.name,
      description: prismaModel.description || undefined,
      platform: prismaModel.platform as Platform,
      status: prismaModel.status as CampaignStatus,
      startDate: prismaModel.startDate,
      endDate: prismaModel.endDate || undefined,
      totalBudget: prismaModel.totalBudget || undefined,
      currency: prismaModel.currency,
      targetAudience: prismaModel.targetAudience || undefined,
      objectives: prismaModel.objectives,
      tags: prismaModel.tags,
      metadata: prismaModel.metadata as Record<string, any>,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   *
   * @param domainEntity - Domain AdvertisingCampaign entity
   * @returns Prisma model creation data
   */
  static toPrisma(domainEntity: AdvertisingCampaign): Omit<
    PrismaAdvertisingCampaign,
    'createdAt' | 'updatedAt'
  > {
    return {
      id: domainEntity.id,
      name: domainEntity.name,
      description: domainEntity.description || null,
      platform: domainEntity.platform,
      status: domainEntity.status,
      startDate: domainEntity.startDate,
      endDate: domainEntity.endDate || null,
      totalBudget: domainEntity.totalBudget || null,
      currency: domainEntity.currency,
      targetAudience: domainEntity.targetAudience || null,
      objectives: domainEntity.objectives,
      tags: domainEntity.tags,
      metadata: domainEntity.metadata,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   *
   * @param domainEntity - Domain AdvertisingCampaign entity
   * @returns Prisma model update data
   */
  static toPrismaUpdate(domainEntity: AdvertisingCampaign): Partial<PrismaAdvertisingCampaign> {
    return {
      name: domainEntity.name,
      description: domainEntity.description || null,
      platform: domainEntity.platform,
      status: domainEntity.status,
      startDate: domainEntity.startDate,
      endDate: domainEntity.endDate || null,
      totalBudget: domainEntity.totalBudget || null,
      currency: domainEntity.currency,
      targetAudience: domainEntity.targetAudience || null,
      objectives: domainEntity.objectives,
      tags: domainEntity.tags,
      metadata: domainEntity.metadata,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert array of Prisma models to domain entities
   *
   * @param prismaModels - Array of Prisma models
   * @returns Array of domain entities
   */
  static toDomainArray(prismaModels: PrismaAdvertisingCampaign[]): AdvertisingCampaign[] {
    return prismaModels.map((model) => this.toDomain(model));
  }
}
