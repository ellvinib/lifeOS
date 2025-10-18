/**
 * GraphQL client for Finance dashboard queries
 */

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:4000/graphql';

/**
 * Execute a GraphQL query
 */
async function graphqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add authentication token when auth is implemented
      // 'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL query failed');
  }

  return result.data;
}

/**
 * Dashboard Types
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
  categoryCounts: Record<string, number>;
  savingsRate: number;
  expenseRatio: number;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
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
  budgetAmount?: number;
  budgetUsedPercent?: number;
  remainingBudget?: number;
  isOverBudget: boolean;
  isApproachingBudgetLimit: boolean;
  calculatedAt: string;
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
  comparison?: MonthComparison;
  trends?: TrendData;
}

export interface CategoryTrend {
  category: string;
  averageSpending: number;
  totalSpending: number;
  averageTransactionCount: number;
  growthRate: number;
  isIncreasing: boolean;
}

export interface CategoryDistribution {
  category: string;
  amount: number;
  percentage: number;
}

/**
 * GraphQL Queries
 */
const GET_DASHBOARD_QUERY = `
  query GetDashboard(
    $userId: ID!
    $month: String
    $includeComparison: Boolean
    $includeTrends: Boolean
  ) {
    getDashboard(
      userId: $userId
      month: $month
      includeComparison: $includeComparison
      includeTrends: $includeTrends
    ) {
      currentMonth {
        summary {
          id
          userId
          month
          totalIncome
          totalExpenses
          netCashFlow
          transactionCount
          averageTransactionSize
          largestExpense
          largestIncome
          categoryCounts
          savingsRate
          expenseRatio
          calculatedAt
          createdAt
          updatedAt
        }
        categoryTotals {
          id
          userId
          month
          category
          totalAmount
          transactionCount
          averageAmount
          percentOfTotal
          largestTransaction
          budgetAmount
          budgetUsedPercent
          remainingBudget
          isOverBudget
          isApproachingBudgetLimit
          calculatedAt
        }
        topCategories {
          id
          category
          totalAmount
          transactionCount
          percentOfTotal
        }
        overBudgetCategories {
          id
          category
          totalAmount
          budgetAmount
          budgetUsedPercent
          remainingBudget
          isOverBudget
        }
      }
      comparison {
        previousMonth {
          month
          totalIncome
          totalExpenses
          netCashFlow
          savingsRate
        }
        incomeDelta
        expensesDelta
        netCashFlowDelta
        incomePercentChange
        expensesPercentChange
        savingsRateDelta
      }
      trends {
        summaries {
          month
          totalIncome
          totalExpenses
          netCashFlow
        }
        averageIncome
        averageExpenses
        incomeGrowthRate
        expensesGrowthRate
      }
    }
  }
`;

const GET_CATEGORY_TREND_QUERY = `
  query GetCategoryTrend(
    $userId: ID!
    $category: String!
    $startDate: String!
    $endDate: String!
  ) {
    getCategoryTrend(
      userId: $userId
      category: $category
      startDate: $startDate
      endDate: $endDate
    ) {
      category
      averageSpending
      totalSpending
      averageTransactionCount
      growthRate
      isIncreasing
    }
  }
`;

const GET_OVER_BUDGET_CATEGORIES_QUERY = `
  query GetOverBudgetCategories($userId: ID!, $month: String!) {
    getOverBudgetCategories(userId: $userId, month: $month) {
      id
      category
      totalAmount
      budgetAmount
      budgetUsedPercent
      remainingBudget
      isOverBudget
      isApproachingBudgetLimit
    }
  }
`;

const GET_SPENDING_DISTRIBUTION_QUERY = `
  query GetSpendingDistribution($userId: ID!, $month: String!) {
    getSpendingDistribution(userId: $userId, month: $month) {
      category
      amount
      percentage
    }
  }
`;

const GET_MONTHLY_SUMMARY_QUERY = `
  query GetMonthlySummary($userId: ID!, $month: String!) {
    getMonthlySummary(userId: $userId, month: $month) {
      id
      userId
      month
      totalIncome
      totalExpenses
      netCashFlow
      transactionCount
      averageTransactionSize
      largestExpense
      largestIncome
      categoryCounts
      savingsRate
      expenseRatio
      calculatedAt
      createdAt
      updatedAt
    }
  }
`;

const REFRESH_DASHBOARD_MUTATION = `
  mutation RefreshDashboard(
    $userId: ID!
    $month: String
    $forceRecalculation: Boolean
  ) {
    refreshDashboard(
      userId: $userId
      month: $month
      forceRecalculation: $forceRecalculation
    ) {
      success
      monthlySummaryId
      categoryTotalIds
      transactionsProcessed
      calculatedAt
    }
  }
`;

/**
 * Finance GraphQL API
 */
export const financeGraphQL = {
  /**
   * Get complete dashboard data
   */
  getDashboard: async (params: {
    userId: string;
    month?: string;
    includeComparison?: boolean;
    includeTrends?: boolean;
  }): Promise<DashboardData> => {
    const response = await graphqlRequest<{ getDashboard: DashboardData }>(
      GET_DASHBOARD_QUERY,
      params
    );
    return response.getDashboard;
  },

  /**
   * Get category spending trend
   */
  getCategoryTrend: async (params: {
    userId: string;
    category: string;
    startDate: string;
    endDate: string;
  }): Promise<CategoryTrend> => {
    const response = await graphqlRequest<{ getCategoryTrend: CategoryTrend }>(
      GET_CATEGORY_TREND_QUERY,
      params
    );
    return response.getCategoryTrend;
  },

  /**
   * Get over-budget categories
   */
  getOverBudgetCategories: async (params: {
    userId: string;
    month: string;
  }): Promise<CategoryTotal[]> => {
    const response = await graphqlRequest<{ getOverBudgetCategories: CategoryTotal[] }>(
      GET_OVER_BUDGET_CATEGORIES_QUERY,
      params
    );
    return response.getOverBudgetCategories;
  },

  /**
   * Get spending distribution
   */
  getSpendingDistribution: async (params: {
    userId: string;
    month: string;
  }): Promise<CategoryDistribution[]> => {
    const response = await graphqlRequest<{ getSpendingDistribution: CategoryDistribution[] }>(
      GET_SPENDING_DISTRIBUTION_QUERY,
      params
    );
    return response.getSpendingDistribution;
  },

  /**
   * Get monthly summary
   */
  getMonthlySummary: async (params: {
    userId: string;
    month: string;
  }): Promise<MonthlySummary | null> => {
    const response = await graphqlRequest<{ getMonthlySummary: MonthlySummary | null }>(
      GET_MONTHLY_SUMMARY_QUERY,
      params
    );
    return response.getMonthlySummary;
  },

  /**
   * Manually refresh dashboard aggregations
   */
  refreshDashboard: async (params: {
    userId: string;
    month?: string;
    forceRecalculation?: boolean;
  }): Promise<{
    success: boolean;
    monthlySummaryId: string;
    categoryTotalIds: string[];
    transactionsProcessed: number;
    calculatedAt: string;
  }> => {
    const response = await graphqlRequest<{
      refreshDashboard: {
        success: boolean;
        monthlySummaryId: string;
        categoryTotalIds: string[];
        transactionsProcessed: number;
        calculatedAt: string;
      };
    }>(REFRESH_DASHBOARD_MUTATION, params);
    return response.refreshDashboard;
  },
};
