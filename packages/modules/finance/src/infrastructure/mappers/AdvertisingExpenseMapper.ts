/**
 * AdvertisingExpense Mapper
 *
 * Translates between Prisma models and domain entities.
 * Follows single responsibility principle.
 *
 * @module Finance
 */

import { AdvertisingExpense as PrismaAdvertisingExpense } from '@prisma/client';
import { AdvertisingExpense } from '../../domain/entities/AdvertisingExpense';
import { Platform, AdType } from '../../domain/value-objects/AdvertisingEnums';

/**
 * Maps between Prisma AdvertisingExpense model and domain entity
 */
export class AdvertisingExpenseMapper {
  /**
   * Convert Prisma model to domain entity
   *
   * @param prismaModel - Prisma AdvertisingExpense model
   * @returns Domain AdvertisingExpense entity
   */
  static toDomain(prismaModel: PrismaAdvertisingExpense): AdvertisingExpense {
    return new AdvertisingExpense({
      id: prismaModel.id,
      campaignId: prismaModel.campaignId,
      date: prismaModel.date,
      amount: prismaModel.amount,
      currency: prismaModel.currency,
      platform: prismaModel.platform as Platform,
      adType: prismaModel.adType as AdType,
      description: prismaModel.description || undefined,
      impressions: prismaModel.impressions || undefined,
      clicks: prismaModel.clicks || undefined,
      conversions: prismaModel.conversions || undefined,
      revenue: prismaModel.revenue || undefined,
      likes: prismaModel.likes || undefined,
      shares: prismaModel.shares || undefined,
      comments: prismaModel.comments || undefined,
      videoViews: prismaModel.videoViews || undefined,
      targetAudience: prismaModel.targetAudience || undefined,
      ageRange: prismaModel.ageRange || undefined,
      location: prismaModel.location || undefined,
      creativeUrl: prismaModel.creativeUrl || undefined,
      landingPageUrl: prismaModel.landingPageUrl || undefined,
      notes: prismaModel.notes || undefined,
      tags: prismaModel.tags,
      metadata: prismaModel.metadata as Record<string, any>,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   *
   * @param domainEntity - Domain AdvertisingExpense entity
   * @returns Prisma model creation data
   */
  static toPrisma(domainEntity: AdvertisingExpense): Omit<
    PrismaAdvertisingExpense,
    'createdAt' | 'updatedAt'
  > {
    return {
      id: domainEntity.id,
      campaignId: domainEntity.campaignId,
      date: domainEntity.date,
      amount: domainEntity.amount,
      currency: domainEntity.currency,
      platform: domainEntity.platform,
      adType: domainEntity.adType,
      description: domainEntity.description || null,
      impressions: domainEntity.impressions || null,
      clicks: domainEntity.clicks || null,
      conversions: domainEntity.conversions || null,
      revenue: domainEntity.revenue || null,
      likes: domainEntity.likes || null,
      shares: domainEntity.shares || null,
      comments: domainEntity.comments || null,
      videoViews: domainEntity.videoViews || null,
      targetAudience: domainEntity.targetAudience || null,
      ageRange: domainEntity.ageRange || null,
      location: domainEntity.location || null,
      creativeUrl: domainEntity.creativeUrl || null,
      landingPageUrl: domainEntity.landingPageUrl || null,
      notes: domainEntity.notes || null,
      tags: domainEntity.tags,
      metadata: domainEntity.metadata,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   *
   * @param domainEntity - Domain AdvertisingExpense entity
   * @returns Prisma model update data
   */
  static toPrismaUpdate(domainEntity: AdvertisingExpense): Partial<PrismaAdvertisingExpense> {
    return {
      campaignId: domainEntity.campaignId,
      date: domainEntity.date,
      amount: domainEntity.amount,
      currency: domainEntity.currency,
      platform: domainEntity.platform,
      adType: domainEntity.adType,
      description: domainEntity.description || null,
      impressions: domainEntity.impressions || null,
      clicks: domainEntity.clicks || null,
      conversions: domainEntity.conversions || null,
      revenue: domainEntity.revenue || null,
      likes: domainEntity.likes || null,
      shares: domainEntity.shares || null,
      comments: domainEntity.comments || null,
      videoViews: domainEntity.videoViews || null,
      targetAudience: domainEntity.targetAudience || null,
      ageRange: domainEntity.ageRange || null,
      location: domainEntity.location || null,
      creativeUrl: domainEntity.creativeUrl || null,
      landingPageUrl: domainEntity.landingPageUrl || null,
      notes: domainEntity.notes || null,
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
  static toDomainArray(prismaModels: PrismaAdvertisingExpense[]): AdvertisingExpense[] {
    return prismaModels.map((model) => this.toDomain(model));
  }
}
