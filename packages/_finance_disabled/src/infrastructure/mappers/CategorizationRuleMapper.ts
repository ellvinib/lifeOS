import { CategorizationRule as PrismaCategorizationRule } from '@prisma/client';
import { CategorizationRule, PatternType, RuleSource } from '../../domain/entities/CategorizationRule';
import { ExpenseCategory } from '../../domain/entities/Expense';

/**
 * Categorization Rule Mapper
 *
 * Maps between Prisma CategorizationRule model and domain CategorizationRule entity.
 */
export class CategorizationRuleMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaCategorizationRule): CategorizationRule {
    return CategorizationRule.reconstitute({
      id: prisma.id,
      userId: prisma.userId,
      pattern: prisma.pattern,
      patternType: prisma.patternType as PatternType,
      category: prisma.category as ExpenseCategory,
      confidence: prisma.confidence,
      priority: prisma.priority,
      isActive: prisma.isActive,
      source: prisma.source as RuleSource,
      metadata: (prisma.metadata as Record<string, unknown>) || undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   */
  public static toPrisma(rule: CategorizationRule): Omit<PrismaCategorizationRule, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId: rule.userId,
      pattern: rule.pattern,
      patternType: rule.patternType,
      category: rule.category,
      confidence: rule.confidence,
      priority: rule.priority,
      isActive: rule.isActive,
      source: rule.source,
      metadata: (rule.metadata as any) || {},
    };
  }

  /**
   * Convert domain entity to Prisma create data
   */
  public static toCreateData(rule: CategorizationRule) {
    return {
      id: rule.id,
      ...this.toPrisma(rule),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   */
  public static toUpdateData(rule: CategorizationRule) {
    return {
      ...this.toPrisma(rule),
      updatedAt: rule.updatedAt,
    };
  }
}
