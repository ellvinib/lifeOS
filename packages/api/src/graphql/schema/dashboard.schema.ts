import { gql } from 'graphql-tag';

/**
 * Dashboard GraphQL Schema
 *
 * Defines queries and types for dashboard data.
 */
export const dashboardSchema = gql`
  """
  Monthly financial summary
  """
  type MonthlySummary {
    id: ID!
    userId: ID!
    month: String!
    totalIncome: Float!
    totalExpenses: Float!
    netCashFlow: Float!
    transactionCount: Int!
    averageTransactionSize: Float!
    largestExpense: Float!
    largestIncome: Float!
    categoryCounts: JSON!
    savingsRate: Float!
    expenseRatio: Float!
    calculatedAt: String!
    createdAt: String!
    updatedAt: String!
  }

  """
  Category spending total
  """
  type CategoryTotal {
    id: ID!
    userId: ID!
    month: String!
    category: String!
    totalAmount: Float!
    transactionCount: Int!
    averageAmount: Float!
    percentOfTotal: Float!
    largestTransaction: Float!
    budgetAmount: Float
    budgetUsedPercent: Float
    remainingBudget: Float
    isOverBudget: Boolean!
    isApproachingBudgetLimit: Boolean!
    calculatedAt: String!
  }

  """
  Month-over-month comparison
  """
  type MonthComparison {
    previousMonth: MonthlySummary!
    incomeDelta: Float!
    expensesDelta: Float!
    netCashFlowDelta: Float!
    incomePercentChange: Float!
    expensesPercentChange: Float!
    savingsRateDelta: Float!
  }

  """
  Trend data across multiple months
  """
  type TrendData {
    summaries: [MonthlySummary!]!
    averageIncome: Float!
    averageExpenses: Float!
    incomeGrowthRate: Float!
    expensesGrowthRate: Float!
  }

  """
  Complete dashboard data
  """
  type DashboardData {
    currentMonth: CurrentMonthData!
    comparison: MonthComparison
    trends: TrendData
  }

  """
  Current month dashboard data
  """
  type CurrentMonthData {
    summary: MonthlySummary!
    categoryTotals: [CategoryTotal!]!
    topCategories: [CategoryTotal!]!
    overBudgetCategories: [CategoryTotal!]!
  }

  """
  Category spending distribution
  """
  type CategoryDistribution {
    category: String!
    amount: Float!
    percentage: Float!
  }

  """
  Category trend over time
  """
  type CategoryTrend {
    category: String!
    averageSpending: Float!
    totalSpending: Float!
    averageTransactionCount: Float!
    growthRate: Float!
    isIncreasing: Boolean!
  }

  """
  JSON scalar for flexible data
  """
  scalar JSON

  """
  Dashboard queries
  """
  type Query {
    """
    Get complete dashboard data for a user
    """
    getDashboard(
      userId: ID!
      month: String
      includeComparison: Boolean
      includeTrends: Boolean
    ): DashboardData!

    """
    Get monthly summary for a specific month
    """
    getMonthlySummary(userId: ID!, month: String!): MonthlySummary

    """
    Get recent monthly summaries
    """
    getRecentMonthlySummaries(userId: ID!, limit: Int): [MonthlySummary!]!

    """
    Get category totals for a specific month
    """
    getCategoryTotals(userId: ID!, month: String!): [CategoryTotal!]!

    """
    Get spending distribution for a month
    """
    getSpendingDistribution(userId: ID!, month: String!): [CategoryDistribution!]!

    """
    Get trend for a specific category
    """
    getCategoryTrend(
      userId: ID!
      category: String!
      startDate: String!
      endDate: String!
    ): CategoryTrend

    """
    Get over-budget categories for a month
    """
    getOverBudgetCategories(userId: ID!, month: String!): [CategoryTotal!]!
  }

  """
  Dashboard mutations
  """
  type Mutation {
    """
    Manually trigger dashboard aggregation refresh
    """
    refreshDashboard(userId: ID!, month: String, forceRecalculation: Boolean): RefreshResult!
  }

  """
  Result of refresh operation
  """
  type RefreshResult {
    success: Boolean!
    monthlySummaryId: ID!
    categoryTotalIds: [ID!]!
    transactionsProcessed: Int!
    calculatedAt: String!
  }
`;
