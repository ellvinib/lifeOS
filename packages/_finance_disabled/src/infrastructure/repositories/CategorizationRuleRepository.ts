import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  ICategorizationRuleRepository,
  CategorizationRuleQueryOptions,
} from '../../domain/interfaces/ICategorizationRuleRepository';
import { CategorizationRule, PatternType, RuleSource } from '../../domain/entities/CategorizationRule';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { CategorizationRuleMapper } from '../mappers/CategorizationRuleMapper';

/**
 * Categorization Rule Repository Implementation with Prisma
 */
export class CategorizationRuleRepository implements ICategorizationRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Result<CategorizationRule, BaseError>> {
    try {
      const rule = await this.prisma.categorizationRule.findUnique({
        where: { id },
      });

      if (!rule) {
        return Result.fail(new NotFoundError('CategorizationRule', id));
      }

      return Result.ok(CategorizationRuleMapper.toDomain(rule));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find categorization rule', error)
      );
    }
  }

  async findByUserId(userId: string): Promise<Result<CategorizationRule[], BaseError>> {
    try {
      const rules = await this.prisma.categorizationRule.findMany({
        where: { userId },
        orderBy: { priority: 'desc' },
      });

      return Result.ok(rules.map(CategorizationRuleMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find rules by user ID', error)
      );
    }
  }

  async findActiveByUserId(userId: string): Promise<Result<CategorizationRule[], BaseError>> {
    try {
      const rules = await this.prisma.categorizationRule.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });

      return Result.ok(rules.map(CategorizationRuleMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find active rules', error)
      );
    }
  }

  async findByCategory(userId: string, category: ExpenseCategory): Promise<Result<CategorizationRule[], BaseError>> {
    return this.findAll({ userId, category });
  }

  async findBySource(userId: string, source: RuleSource): Promise<Result<CategorizationRule[], BaseError>> {
    return this.findAll({ userId, source });
  }

  async findAll(options?: CategorizationRuleQueryOptions): Promise<Result<CategorizationRule[], BaseError>> {
    try {
      const where: any = {};

      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.patternType) {
        where.patternType = options.patternType;
      }

      if (options?.source) {
        where.source = options.source;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      if (options?.minPriority !== undefined) {
        where.priority = { gte: options.minPriority };
      }

      const skip = options?.page && options?.limit
        ? (options.page - 1) * options.limit
        : undefined;

      const rules = await this.prisma.categorizationRule.findMany({
        where,
        orderBy: { priority: 'desc' },
        take: options?.limit,
        skip,
      });

      return Result.ok(rules.map(CategorizationRuleMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find categorization rules', error)
      );
    }
  }

  async create(rule: CategorizationRule): Promise<Result<CategorizationRule, BaseError>> {
    try {
      const data = CategorizationRuleMapper.toCreateData(rule);

      const created = await this.prisma.categorizationRule.create({
        data,
      });

      return Result.ok(CategorizationRuleMapper.toDomain(created));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create categorization rule', error)
      );
    }
  }

  async update(rule: CategorizationRule): Promise<Result<CategorizationRule, BaseError>> {
    try {
      const data = CategorizationRuleMapper.toUpdateData(rule);

      const updated = await this.prisma.categorizationRule.update({
        where: { id: rule.id },
        data,
      });

      return Result.ok(CategorizationRuleMapper.toDomain(updated));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('CategorizationRule', rule.id));
      }

      return Result.fail(
        new DatabaseError('Failed to update categorization rule', error)
      );
    }
  }

  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.categorizationRule.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('CategorizationRule', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete categorization rule', error)
      );
    }
  }

  async bulkCreate(rules: CategorizationRule[]): Promise<Result<CategorizationRule[], BaseError>> {
    try {
      const data = rules.map(rule => CategorizationRuleMapper.toCreateData(rule));

      await this.prisma.categorizationRule.createMany({
        data,
      });

      // Fetch created rules
      const created = await this.prisma.categorizationRule.findMany({
        where: {
          id: { in: rules.map(r => r.id) },
        },
      });

      return Result.ok(created.map(CategorizationRuleMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to bulk create categorization rules', error)
      );
    }
  }

  async count(options?: CategorizationRuleQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.patternType) {
        where.patternType = options.patternType;
      }

      if (options?.source) {
        where.source = options.source;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      const count = await this.prisma.categorizationRule.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count categorization rules', error)
      );
    }
  }
}
