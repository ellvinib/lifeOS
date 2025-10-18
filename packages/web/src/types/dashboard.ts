/**
 * Dashboard TypeScript Types
 *
 * Mirrors GraphQL schema types
 */

export interface MonthlySummary {
  id: string;
  userId: string;
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
  averageTransactionSize: number;
  largestExpense: number;
  largestIncome: number;
  savingsRate: number;
  expenseRatio: number;
  calculatedAt: string;
}

export interface CategoryTotal {
  id: string;
  userId: string;
  month: string;
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentOfTotal: number;
  largestTransaction: number;
  budgetAmount?: number | null;
  budgetUsedPercent?: number | null;
  remainingBudget?: number | null;
  isOverBudget: boolean;
  isApproachingBudgetLimit: boolean;
  calculatedAt: string;
}

export interface CategoryDistribution {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthComparison {
  previousMonth: MonthlySummary;
  incomeDelta: number;
  expensesDelta: number;
  netCashFlowDelta: number;
  incomePercentChange: number;
  expensesPercentChange: number;
  savingsRateDelta: number;
}

export interface TrendData {
  summaries: MonthlySummary[];
  averageIncome: number;
  averageExpenses: number;
  incomeGrowthRate: number;
  expensesGrowthRate: number;
}

export interface CurrentMonthData {
  summary: MonthlySummary;
  categoryTotals: CategoryTotal[];
  topCategories: CategoryTotal[];
  overBudgetCategories: CategoryTotal[];
}

export interface DashboardData {
  currentMonth: CurrentMonthData;
  comparison?: MonthComparison | null;
  trends?: TrendData | null;
}

export interface CategoryTrend {
  category: string;
  averageSpending: number;
  totalSpending: number;
  averageTransactionCount: number;
  growthRate: number;
  isIncreasing: boolean;
}

export interface RefreshResult {
  success: boolean;
  monthlySummaryId: string;
  categoryTotalIds: string[];
  transactionsProcessed: number;
  calculatedAt: string;
}
