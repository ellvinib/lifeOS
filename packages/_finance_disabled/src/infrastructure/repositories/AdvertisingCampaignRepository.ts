/**
 * AdvertisingCampaign Repository Implementation
 *
 * Prisma-based implementation of IAdvertisingCampaignRepository.
 * All methods return Result<T, E> for explicit error handling.
 *
 * @module Finance
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeos/core/shared/errors';
import { IAdvertisingCampaignRepository } from '../../domain/interfaces/IAdvertisingCampaignRepository';
import { AdvertisingCampaign } from '../../domain/entities/AdvertisingCampaign';
import { Platform, CampaignStatus } from '../../domain/value-objects/AdvertisingEnums';
import { AdvertisingCampaignMapper } from '../mappers/AdvertisingCampaignMapper';

/**
 * Prisma implementation of AdvertisingCampaign repository
 */
export class AdvertisingCampaignRepository implements IAdvertisingCampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find campaign by ID
   */
  async findById(id: string): Promise<Result<AdvertisingCampaign, BaseError>> {
    try {
      const campaign = await this.prisma.advertisingCampaign.findUnique({
        where: { id },
      });

      if (!campaign) {
        return Result.fail(new NotFoundError('AdvertisingCampaign', id));
      }

      return Result.ok(AdvertisingCampaignMapper.toDomain(campaign));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find advertising campaign', error as Error)
      );
    }
  }

  /**
   * Find all campaigns
   */
  async findAll(): Promise<Result<AdvertisingCampaign[], BaseError>> {
    try {
      const campaigns = await this.prisma.advertisingCampaign.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(AdvertisingCampaignMapper.toDomainArray(campaigns));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find advertising campaigns', error as Error)
      );
    }
  }

  /**
   * Find campaigns by platform
   */
  async findByPlatform(platform: Platform): Promise<Result<AdvertisingCampaign[], BaseError>> {
    try {
      const campaigns = await this.prisma.advertisingCampaign.findMany({
        where: { platform },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(AdvertisingCampaignMapper.toDomainArray(campaigns));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find campaigns by platform', error as Error)
      );
    }
  }

  /**
   * Find campaigns by status
   */
  async findByStatus(status: CampaignStatus): Promise<Result<AdvertisingCampaign[], BaseError>> {
    try {
      const campaigns = await this.prisma.advertisingCampaign.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(AdvertisingCampaignMapper.toDomainArray(campaigns));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find campaigns by status', error as Error)
      );
    }
  }

  /**
   * Find active campaigns
   */
  async findActiveCampaigns(): Promise<Result<AdvertisingCampaign[], BaseError>> {
    try {
      const campaigns = await this.prisma.advertisingCampaign.findMany({
        where: { status: CampaignStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(AdvertisingCampaignMapper.toDomainArray(campaigns));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find active campaigns', error as Error)
      );
    }
  }

  /**
   * Find campaigns within date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<AdvertisingCampaign[], BaseError>> {
    try {
      const campaigns = await this.prisma.advertisingCampaign.findMany({
        where: {
          OR: [
            {
              startDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            {
              endDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            {
              AND: [
                { startDate: { lte: startDate } },
                {
                  OR: [{ endDate: { gte: endDate } }, { endDate: null }],
                },
              ],
            },
          ],
        },
        orderBy: { startDate: 'desc' },
      });

      return Result.ok(AdvertisingCampaignMapper.toDomainArray(campaigns));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find campaigns by date range', error as Error)
      );
    }
  }

  /**
   * Create a new campaign
   */
  async create(campaign: AdvertisingCampaign): Promise<Result<AdvertisingCampaign, BaseError>> {
    try {
      const data = AdvertisingCampaignMapper.toPrisma(campaign);

      const created = await this.prisma.advertisingCampaign.create({
        data: {
          ...data,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
      });

      return Result.ok(AdvertisingCampaignMapper.toDomain(created));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create advertising campaign', error as Error)
      );
    }
  }

  /**
   * Update an existing campaign
   */
  async update(campaign: AdvertisingCampaign): Promise<Result<AdvertisingCampaign, BaseError>> {
    try {
      const data = AdvertisingCampaignMapper.toPrismaUpdate(campaign);

      const updated = await this.prisma.advertisingCampaign.update({
        where: { id: campaign.id },
        data,
      });

      return Result.ok(AdvertisingCampaignMapper.toDomain(updated));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to update advertising campaign', error as Error)
      );
    }
  }

  /**
   * Delete a campaign
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.advertisingCampaign.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete advertising campaign', error as Error)
      );
    }
  }

  /**
   * Check if campaign exists
   */
  async exists(id: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.advertisingCampaign.count({
        where: { id },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check campaign existence', error as Error)
      );
    }
  }

  /**
   * Count total campaigns
   */
  async count(): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.advertisingCampaign.count();
      return Result.ok(count);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to count campaigns', error as Error));
    }
  }

  /**
   * Count campaigns by status
   */
  async countByStatus(status: CampaignStatus): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.advertisingCampaign.count({
        where: { status },
      });
      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count campaigns by status', error as Error)
      );
    }
  }
}
