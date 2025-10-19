import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError } from '@lifeOS/core/shared/errors';
import { IExpenseRepository, IBudgetRepository } from '../../domain/interfaces';
import { ExpenseCategory } from '../../domain/entities';

/**
 * Affordability Check Input
 */
export interface CheckAffordabilityInput {
  amount: number;
  category: ExpenseCategory;
}

/**
 * Envelope Impact
 */
export interface EnvelopeImpact {
  category: ExpenseCategory;
  currentSpent: number;
  planned: number;
  afterPurchase: number;
  percentageAfter: number;
  status: 'safe' | 'warning' | 'danger';
}

/**
 * Alternative Suggestion
 */
export interface AlternativeSuggestion {
  suggestion: string;
  potentialSavings: number;
}

/**
 * Affordability Check Output
 */
export interface AffordabilityCheckOutput {
  canAfford: boolean;
  severity: 'safe' | 'warning' | 'danger';
  dailyImpact: {
    currentRemaining: number;
    afterPurchase: number;
    dailyLimit: number;
    percentageUsedAfter: number;
  };
  envelopeImpact: EnvelopeImpact;
  recommendations: string[];
  alternatives: AlternativeSuggestion[];
  monthlyImpact: {
    currentSpent: number;
    totalBudget: number;
    afterPurchase: number;
    stillOnTrack: boolean;
  };
}

/**
 * Check Affordability Use Case
 *
 * The "killer feature" - helps users make informed spending decisions
 * BEFORE they make a purchase.
 *
 * Analyzes:
 * 1. Impact on daily budget
 * 2. Impact on category envelope
 * 3. Impact on monthly budget
 * 4. Generates personalized recommendations
 * 5. Suggests alternatives to save money
 *
 * This is the "Kan ik dit betalen?" feature.
 */
export class CheckAffordabilityUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly expenseRepository: IExpenseRepository
  ) {}

  async execute(input: CheckAffordabilityInput): Promise<Result<AffordabilityCheckOutput, BaseError>> {
    // Get current month's budget
    const budgetResult = await this.budgetRepository.getCurrentMonth();
    if (budgetResult.isFail()) {
      return budgetResult;
    }

    const budget = budgetResult.value;
    if (!budget) {
      return Result.fail(
        new NotFoundError('Budget', 'current-month', 'No budget found for current month')
      );
    }

    // Calculate date information
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get today's date range
    const startOfToday = new Date(year, month, dayOfMonth, 0, 0, 0);
    const endOfToday = new Date(year, month, dayOfMonth, 23, 59, 59);
    const startOfMonth = new Date(year, month, 1, 0, 0, 0);

    // Get today's spending
    const todayExpensesResult = await this.expenseRepository.findByDateRange(
      startOfToday,
      endOfToday
    );
    if (todayExpensesResult.isFail()) {
      return todayExpensesResult;
    }

    const spentToday = todayExpensesResult.value.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Get this month's total spending
    const monthTotalResult = await this.expenseRepository.getTotalForPeriod(
      startOfMonth,
      now
    );
    if (monthTotalResult.isFail()) {
      return monthTotalResult;
    }

    const spentThisMonth = monthTotalResult.value;

    // Get category spending
    const categorySpendingResult = await this.expenseRepository.getTotalByCategory(
      input.category,
      startOfMonth,
      now
    );
    if (categorySpendingResult.isFail()) {
      return categorySpendingResult;
    }

    const categorySpent = categorySpendingResult.value;

    // Calculate daily impact
    const totalBudget = budget.getTotalPlanned();
    const dailyLimit = totalBudget / daysInMonth;
    const currentRemaining = dailyLimit - spentToday;
    const afterPurchaseRemaining = currentRemaining - input.amount;
    const canAffordDaily = afterPurchaseRemaining >= 0;
    const percentageUsedAfter = ((spentToday + input.amount) / dailyLimit) * 100;

    // Calculate envelope (category) impact
    const categoryBudget = budget.getCategoryBudget(input.category);
    const categoryPlanned = categoryBudget?.plannedAmount || 0;
    const categoryAfter = categorySpent + input.amount;
    const categoryPercentageAfter = categoryPlanned > 0
      ? (categoryAfter / categoryPlanned) * 100
      : 100;

    let categoryStatus: 'safe' | 'warning' | 'danger' = 'safe';
    if (categoryPercentageAfter >= 100) categoryStatus = 'danger';
    else if (categoryPercentageAfter >= 85) categoryStatus = 'warning';

    const envelopeImpact: EnvelopeImpact = {
      category: input.category,
      currentSpent: Math.round(categorySpent * 100) / 100,
      planned: Math.round(categoryPlanned * 100) / 100,
      afterPurchase: Math.round(categoryAfter * 100) / 100,
      percentageAfter: Math.round(categoryPercentageAfter),
      status: categoryStatus,
    };

    // Calculate monthly impact
    const monthAfter = spentThisMonth + input.amount;
    const expectedByNow = dailyLimit * dayOfMonth;
    const stillOnTrack = monthAfter <= expectedByNow;

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      canAffordDaily,
      afterPurchaseRemaining,
      categoryStatus,
      categoryPercentageAfter,
      stillOnTrack,
      amount: input.amount,
    });

    // Generate alternatives
    const alternatives = this.generateAlternatives(input.amount, input.category);

    // Determine overall severity
    let severity: 'safe' | 'warning' | 'danger';
    if (!canAffordDaily || categoryStatus === 'danger' || !stillOnTrack) {
      severity = 'danger';
    } else if (categoryStatus === 'warning' || afterPurchaseRemaining < dailyLimit * 0.2) {
      severity = 'warning';
    } else {
      severity = 'safe';
    }

    return Result.ok({
      canAfford: canAffordDaily,
      severity,
      dailyImpact: {
        currentRemaining: Math.round(currentRemaining * 100) / 100,
        afterPurchase: Math.round(afterPurchaseRemaining * 100) / 100,
        dailyLimit: Math.round(dailyLimit * 100) / 100,
        percentageUsedAfter: Math.round(percentageUsedAfter),
      },
      envelopeImpact,
      recommendations,
      alternatives,
      monthlyImpact: {
        currentSpent: Math.round(spentThisMonth * 100) / 100,
        totalBudget: Math.round(totalBudget * 100) / 100,
        afterPurchase: Math.round(monthAfter * 100) / 100,
        stillOnTrack,
      },
    });
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(context: {
    canAffordDaily: boolean;
    afterPurchaseRemaining: number;
    categoryStatus: 'safe' | 'warning' | 'danger';
    categoryPercentageAfter: number;
    stillOnTrack: boolean;
    amount: number;
  }): string[] {
    const recommendations: string[] = [];

    if (!context.canAffordDaily) {
      recommendations.push(
        `Je overschrijdt je dagelijkse limiet met €${Math.abs(context.afterPurchaseRemaining).toFixed(2)}`
      );
    }

    if (context.categoryStatus === 'danger') {
      recommendations.push(
        `Deze categorie wordt ${Math.round(context.categoryPercentageAfter - 100)}% overschreden`
      );
    } else if (context.categoryStatus === 'warning') {
      recommendations.push(
        `Let op: deze categorie wordt ${Math.round(context.categoryPercentageAfter)}% vol`
      );
    }

    if (!context.stillOnTrack) {
      recommendations.push(
        'Na deze aankoop ben je niet meer on track voor deze maand'
      );
    }

    if (context.amount > 50 && context.categoryStatus !== 'safe') {
      recommendations.push(
        'Grote aankoop - overweeg om een paar dagen te wachten'
      );
    }

    return recommendations;
  }

  /**
   * Generate alternative suggestions to save money
   */
  private generateAlternatives(amount: number, category: ExpenseCategory): AlternativeSuggestion[] {
    const alternatives: AlternativeSuggestion[] = [];

    // General alternatives based on amount
    if (amount > 50) {
      alternatives.push({
        suggestion: 'Wacht tot volgende week voor deze aankoop',
        potentialSavings: amount,
      });
    }

    if (amount > 30) {
      alternatives.push({
        suggestion: 'Zoek naar een goedkoper alternatief',
        potentialSavings: Math.round(amount * 0.3 * 100) / 100,
      });
    }

    // Category-specific alternatives
    if (category === 'dining' && amount > 20) {
      alternatives.push({
        suggestion: 'Kook thuis en bespaar',
        potentialSavings: Math.round(amount * 0.7 * 100) / 100,
      });
    }

    if (category === 'shopping' && amount > 40) {
      alternatives.push({
        suggestion: 'Wacht op sale of gebruik kortingscode',
        potentialSavings: Math.round(amount * 0.25 * 100) / 100,
      });
    }

    if (category === 'entertainment' && amount > 25) {
      alternatives.push({
        suggestion: 'Zoek naar gratis of goedkopere alternatieven',
        potentialSavings: Math.round(amount * 0.5 * 100) / 100,
      });
    }

    if (category === 'transportation' && amount > 15) {
      alternatives.push({
        suggestion: 'Overweeg OV of fietsen in plaats van auto',
        potentialSavings: Math.round(amount * 0.6 * 100) / 100,
      });
    }

    return alternatives;
  }
}
