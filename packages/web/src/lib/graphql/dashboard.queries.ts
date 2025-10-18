import { gql } from '@apollo/client';

/**
 * Dashboard GraphQL Queries
 */

export const GET_DASHBOARD = gql`
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
          month
          totalIncome
          totalExpenses
          netCashFlow
          transactionCount
          savingsRate
          expenseRatio
          largestExpense
          largestIncome
        }
        categoryTotals {
          id
          category
          totalAmount
          transactionCount
          percentOfTotal
          budgetAmount
          budgetUsedPercent
          isOverBudget
          isApproachingBudgetLimit
        }
        topCategories {
          id
          category
          totalAmount
          percentOfTotal
        }
        overBudgetCategories {
          id
          category
          totalAmount
          budgetAmount
          budgetUsedPercent
        }
      }
      comparison {
        previousMonth {
          month
          totalIncome
          totalExpenses
          netCashFlow
        }
        incomeDelta
        expensesDelta
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

export const GET_MONTHLY_SUMMARY = gql`
  query GetMonthlySummary($userId: ID!, $month: String!) {
    getMonthlySummary(userId: $userId, month: $month) {
      id
      month
      totalIncome
      totalExpenses
      netCashFlow
      transactionCount
      averageTransactionSize
      savingsRate
      expenseRatio
      largestExpense
      largestIncome
      calculatedAt
    }
  }
`;

export const GET_SPENDING_DISTRIBUTION = gql`
  query GetSpendingDistribution($userId: ID!, $month: String!) {
    getSpendingDistribution(userId: $userId, month: $month) {
      category
      amount
      percentage
    }
  }
`;

export const GET_CATEGORY_TREND = gql`
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
      growthRate
      isIncreasing
    }
  }
`;

export const REFRESH_DASHBOARD = gql`
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
      transactionsProcessed
      calculatedAt
    }
  }
`;
