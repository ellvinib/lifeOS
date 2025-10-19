/**
 * AdvertisingExpense Repository Implementation
 *
 * Prisma-based implementation of IAdvertisingExpenseRepository.
 * All methods return Result<T, E> for explicit error handling.
 *
 * @module Finance
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeos/core/shared/errors';
import { IAdvertisingExpenseRepository } from '../../domain/interfaces/IAdvertisingExpenseRepository';
import { AdvertisingExpense } from '../../domain/entities/AdvertisingExpense';
import { Platform, AdType } from '../../domain/value-objects/AdvertisingEnums';
import { AdvertisingExpenseMapper } from '../mappers/AdvertisingExpenseMapper';

/**
 * Prisma implementation of AdvertisingExpense repository
 */
export class AdvertisingExpenseRepository implements IAdvertisingExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find expense by ID
   */
  async findById(id: string): Promise<Result<AdvertisingExpense, BaseError>> {
    try {
      const expense = await this.prisma.advertisingExpense.findUnique({
        where: { id },
      });

      if (!expense) {
        return Result.fail(new NotFoundError('AdvertisingExpense', id));
      }

      return Result.ok(AdvertisingExpenseMapper.toDomain(expense));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find advertising expense', error as Error)
      );
    }
  }

  /**
   * Find all expenses
   */
  async findAll(): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        orderBy: { date: 'desc' },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomainArray(expenses));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find advertising expenses', error as Error)
      );
    }
  }

  /**
   * Find expenses by campaign ID
   */
  async findByCampaignId(campaignId: string): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: { campaignId },
        orderBy: { date: 'desc' },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomainArray(expenses));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expenses by campaign', error as Error)
      );
    }
  }

  /**
   * Find expenses by platform
   */
  async findByPlatform(platform: Platform): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: { platform },
        orderBy: { date: 'desc' },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomainArray(expenses));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expenses by platform', error as Error)
      );
    }
  }

  /**
   * Find expenses by ad type
   */
  async findByAdType(adType: AdType): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: { adType },
        orderBy: { date: 'desc' },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomainArray(expenses));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expenses by ad type', error as Error)
      );
    }
  }

  /**
   * Find expenses within date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'desc' },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomainArray(expenses));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expenses by date range', error as Error)
      );
    }
  }

  /**
   * Find expenses by campaign and date range
   */
  async findByCampaignAndDateRange(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: {
          campaignId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'desc' },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomainArray(expenses));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expenses by campaign and date range', error as Error)
      );
    }
  }

  /**
   * Find top performing expenses by ROI
   */
  async findTopPerformingByROI(limit: number): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      // Get expenses with revenue data, calculate ROI in code
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: {
          revenue: { gt: 0 },
          amount: { gt: 0 },
        },
        orderBy: { date: 'desc' },
      });

      // Convert to domain and sort by ROI
      const domainExpenses = AdvertisingExpenseMapper.toDomainArray(expenses);
      const sorted = domainExpenses
        .filter((expense) => expense.roiMetrics.roi > 0)
        .sort((a, b) => b.roiMetrics.roi - a.roiMetrics.roi)
        .slice(0, limit);

      return Result.ok(sorted);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find top performing expenses', error as Error)
      );
    }
  }

  /**
   * Find profitable expenses
   */
  async findProfitable(): Promise<Result<AdvertisingExpense[], BaseError>> {
    try {
      const expenses = await this.prisma.advertisingExpense.findMany({
        where: {
          revenue: { gt: 0 },
        },
        orderBy: { date: 'desc' },
      });

      // Filter profitable in domain layer
      const domainExpenses = AdvertisingExpenseMapper.toDomainArray(expenses);
      const profitable = domainExpenses.filter((expense) => expense.isProfitable);

      return Result.ok(profitable);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find profitable expenses', error as Error)
      );
    }
  }

  /**
   * Create a new expense
   */
  async create(expense: AdvertisingExpense): Promise<Result<AdvertisingExpense, BaseError>> {
    try {
      const data = AdvertisingExpenseMapper.toPrisma(expense);

      const created = await this.prisma.advertisingExpense.create({
        data: {
          ...data,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        },
      });

      return Result.ok(AdvertisingExpenseMapper.toDomain(created));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create advertising expense', error as Error)
      );
    }
  }

  /**
   * Update an existing expense
   */
  async update(expense: AdvertisingExpense): Promise<Result<AdvertisingExpense, BaseError>> {
    try {
      const data = AdvertisingExpenseMapper.toPrismaUpdate(expense);

      const updated = await this.prisma.advertisingExpense.update({
        where: { id: expense.id },
        data,
      });

      return Result.ok(AdvertisingExpenseMapper.toDomain(updated));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to update advertising expense', error as Error)
      );
    }
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.advertisingExpense.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete advertising expense', error as Error)
      );
    }
  }

  /**
   * Delete all expenses for a campaign
   */
  async deleteByCampaignId(campaignId: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.advertisingExpense.deleteMany({
        where: { campaignId },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete expenses by campaign', error as Error)
      );
    }
  }

  /**
   * Check if expense exists
   */
  async exists(id: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.advertisingExpense.count({
        where: { id },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check expense existence', error as Error)
      );
    }
  }

  /**
   * Count total expenses
   */
  async count(): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.advertisingExpense.count();
      return Result.ok(count);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to count expenses', error as Error));
    }
  }

  /**
   * Count expenses for a campaign
   */
  async countByCampaignId(campaignId: string): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.advertisingExpense.count({
        where: { campaignId },
      });
      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count expenses by campaign', error as Error)
      );
    }
  }

  /**
   * Get total spend for a campaign
   */
  async getTotalSpendByCampaignId(campaignId: string): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.advertisingExpense.aggregate({
        where: { campaignId },
        _sum: {
          amount: true,
        },
      });

      return Result.ok(result._sum.amount || 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get total spend', error as Error)
      );
    }
  }

  /**
   * Get total revenue for a campaign
   */
  async getTotalRevenueByCampaignId(campaignId: string): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.advertisingExpense.aggregate({
        where: { campaignId },
        _sum: {
          revenue: true,
        },
      });

      return Result.ok(result._sum.revenue || 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get total revenue', error as Error)
      );
    }
  }

  /**
   * Get aggregated metrics for a campaign
   */
  async getAggregatedMetricsByCampaignId(campaignId: string): Promise<
    Result<
      {
        totalSpend: number;
        totalRevenue: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
      },
      BaseError
    >
  > {
    try {
      const result = await this.prisma.advertisingExpense.aggregate({
        where: { campaignId },
        _sum: {
          amount: true,
          revenue: true,
          impressions: true,
          clicks: true,
          conversions: true,
        },
      });

      return Result.ok({
        totalSpend: result._sum.amount || 0,
        totalRevenue: result._sum.revenue || 0,
        totalImpressions: result._sum.impressions || 0,
        totalClicks: result._sum.clicks || 0,
        totalConversions: result._sum.conversions || 0,
      });
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get aggregated metrics', error as Error)
      );
    }
  }
}
