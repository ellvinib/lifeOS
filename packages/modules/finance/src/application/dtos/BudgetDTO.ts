import { ExpenseCategory } from '../../domain/entities';
import {
  TodayBudgetOutput,
  AffordabilityCheckOutput,
  EnvelopesOutput,
} from '../use-cases';

/**
 * Today Budget Response DTO
 *
 * Powers the TODAY view in the UI
 */
export interface TodayBudgetResponseDTO {
  remainingToday: number;
  dailyLimit: number;
  spentToday: number;
  percentUsed: number;
  totalBudget: number;
  spentThisMonth: number;
  daysInMonth: number;
  dayOfMonth: number;
  onTrack: boolean;
  projectedEndOfMonthTotal: number;
}

/**
 * Affordability Check Request DTO
 */
export interface AffordabilityCheckRequestDTO {
  amount: number;
  category: ExpenseCategory;
}

/**
 * Affordability Check Response DTO
 *
 * Powers the "Kan ik dit betalen?" widget
 */
export interface AffordabilityCheckResponseDTO {
  canAfford: boolean;
  severity: 'safe' | 'warning' | 'danger';
  dailyImpact: {
    currentRemaining: number;
    afterPurchase: number;
    dailyLimit: number;
    percentageUsedAfter: number;
  };
  envelopeImpact: {
    category: ExpenseCategory;
    currentSpent: number;
    planned: number;
    afterPurchase: number;
    percentageAfter: number;
    status: 'safe' | 'warning' | 'danger';
  };
  recommendations: string[];
  alternatives: Array<{
    suggestion: string;
    potentialSavings: number;
  }>;
  monthlyImpact: {
    currentSpent: number;
    totalBudget: number;
    afterPurchase: number;
    stillOnTrack: boolean;
  };
}

/**
 * Envelope Response DTO
 */
export interface EnvelopeDTO {
  category: ExpenseCategory;
  name: string;
  emoji: string;
  planned: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'good' | 'warning' | 'danger';
  recentTransactions: Array<{
    date: string; // ISO 8601
    description: string;
    amount: number;
    merchantName?: string;
  }>;
}

/**
 * Envelopes Response DTO
 *
 * Powers the envelope cards and detail view
 */
export interface EnvelopesResponseDTO {
  envelopes: EnvelopeDTO[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  month: string;
}

/**
 * Budget DTO Mapper
 *
 * Maps between use case outputs and DTOs
 */
export class BudgetDTOMapper {
  /**
   * Convert TodayBudgetOutput to DTO
   */
  public static toTodayBudgetDTO(output: TodayBudgetOutput): TodayBudgetResponseDTO {
    return {
      remainingToday: output.remainingToday,
      dailyLimit: output.dailyLimit,
      spentToday: output.spentToday,
      percentUsed: output.percentUsed,
      totalBudget: output.totalBudget,
      spentThisMonth: output.spentThisMonth,
      daysInMonth: output.daysInMonth,
      dayOfMonth: output.dayOfMonth,
      onTrack: output.onTrack,
      projectedEndOfMonthTotal: output.projectedEndOfMonthTotal,
    };
  }

  /**
   * Convert AffordabilityCheckOutput to DTO
   */
  public static toAffordabilityCheckDTO(
    output: AffordabilityCheckOutput
  ): AffordabilityCheckResponseDTO {
    return {
      canAfford: output.canAfford,
      severity: output.severity,
      dailyImpact: output.dailyImpact,
      envelopeImpact: output.envelopeImpact,
      recommendations: output.recommendations,
      alternatives: output.alternatives,
      monthlyImpact: output.monthlyImpact,
    };
  }

  /**
   * Convert EnvelopesOutput to DTO
   */
  public static toEnvelopesDTO(output: EnvelopesOutput): EnvelopesResponseDTO {
    return {
      envelopes: output.envelopes.map(env => ({
        category: env.category,
        name: env.name,
        emoji: env.emoji,
        planned: env.planned,
        spent: env.spent,
        remaining: env.remaining,
        percentage: env.percentage,
        status: env.status,
        recentTransactions: env.recentTransactions.map(tx => ({
          date: tx.date.toISOString(),
          description: tx.description,
          amount: tx.amount,
          merchantName: tx.merchantName,
        })),
      })),
      totalBudget: output.totalBudget,
      totalSpent: output.totalSpent,
      totalRemaining: output.totalRemaining,
      month: output.month,
    };
  }
}
