/**
 * Cache Keys and TTL Configuration
 *
 * Centralized cache key patterns and TTL values
 */

/**
 * Cache TTL values in seconds
 */
export const CacheTTL = {
  /**
   * Dashboard data - 5 minutes
   * Short TTL for frequently changing financial data
   */
  DASHBOARD: 5 * 60,

  /**
   * Forecast data - 24 hours
   * Long TTL as forecasts don't change frequently
   */
  FORECAST: 24 * 60 * 60,

  /**
   * Category statistics - 1 hour
   * Medium TTL for aggregated category data
   */
  CATEGORY_STATS: 60 * 60,

  /**
   * Monthly summary - 1 hour
   * Medium TTL for monthly aggregations
   */
  MONTHLY_SUMMARY: 60 * 60,

  /**
   * Transaction list - 2 minutes
   * Very short TTL as transactions change frequently
   */
  TRANSACTIONS: 2 * 60,

  /**
   * Budget data - 10 minutes
   * Medium-short TTL for budget information
   */
  BUDGETS: 10 * 60,

  /**
   * User profile - 30 minutes
   * Longer TTL as profile data changes infrequently
   */
  USER_PROFILE: 30 * 60,
} as const;

/**
 * Cache key patterns
 */
export const CacheKeys = {
  /**
   * Dashboard data for a user and month
   * Pattern: dashboard:{userId}:{month}
   */
  dashboard: (userId: string, month?: string): string => {
    const monthKey = month || 'current';
    return `dashboard:${userId}:${monthKey}`;
  },

  /**
   * Dashboard comparison data
   * Pattern: dashboard:comparison:{userId}:{currentMonth}:{previousMonth}
   */
  dashboardComparison: (
    userId: string,
    currentMonth: string,
    previousMonth: string
  ): string => {
    return `dashboard:comparison:${userId}:${currentMonth}:${previousMonth}`;
  },

  /**
   * Dashboard trends data
   * Pattern: dashboard:trends:{userId}:{months}
   */
  dashboardTrends: (userId: string, months: number = 6): string => {
    return `dashboard:trends:${userId}:${months}`;
  },

  /**
   * Monthly summary for a user and month
   * Pattern: monthly-summary:{userId}:{month}
   */
  monthlySummary: (userId: string, month: string): string => {
    return `monthly-summary:${userId}:${month}`;
  },

  /**
   * Category totals for a user and month
   * Pattern: category-totals:{userId}:{month}
   */
  categoryTotals: (userId: string, month: string): string => {
    return `category-totals:${userId}:${month}`;
  },

  /**
   * Spending distribution for a user and month
   * Pattern: spending-distribution:{userId}:{month}
   */
  spendingDistribution: (userId: string, month: string): string => {
    return `spending-distribution:${userId}:${month}`;
  },

  /**
   * Over-budget categories for a user and month
   * Pattern: over-budget:{userId}:{month}
   */
  overBudgetCategories: (userId: string, month: string): string => {
    return `over-budget:${userId}:${month}`;
  },

  /**
   * Forecast data for a user
   * Pattern: forecast:{userId}:{months}
   */
  forecast: (userId: string, months: number = 3): string => {
    return `forecast:${userId}:${months}`;
  },

  /**
   * Transaction list for a user and filters
   * Pattern: transactions:{userId}:{hash}
   */
  transactions: (userId: string, filterHash: string): string => {
    return `transactions:${userId}:${filterHash}`;
  },

  /**
   * Budget data for a user and month
   * Pattern: budgets:{userId}:{month}
   */
  budgets: (userId: string, month: string): string => {
    return `budgets:${userId}:${month}`;
  },

  /**
   * User profile data
   * Pattern: user:profile:{userId}
   */
  userProfile: (userId: string): string => {
    return `user:profile:${userId}`;
  },

  /**
   * Pattern to invalidate all dashboard data for a user
   * Pattern: dashboard:{userId}:*
   */
  dashboardPattern: (userId: string): string => {
    return `dashboard:${userId}:*`;
  },

  /**
   * Pattern to invalidate all monthly summaries for a user
   * Pattern: monthly-summary:{userId}:*
   */
  monthlySummaryPattern: (userId: string): string => {
    return `monthly-summary:${userId}:*`;
  },

  /**
   * Pattern to invalidate all category totals for a user
   * Pattern: category-totals:{userId}:*
   */
  categoryTotalsPattern: (userId: string): string => {
    return `category-totals:${userId}:*`;
  },

  /**
   * Pattern to invalidate all transaction caches for a user
   * Pattern: transactions:{userId}:*
   */
  transactionsPattern: (userId: string): string => {
    return `transactions:${userId}:*`;
  },

  /**
   * Pattern to invalidate all data for a user
   * Pattern: *:{userId}:*
   */
  userPattern: (userId: string): string => {
    return `*:${userId}:*`;
  },
} as const;

/**
 * Cache invalidation events
 *
 * Events that should trigger cache invalidation
 */
export const CacheInvalidationEvents = {
  /**
   * When a transaction is created, updated, or deleted
   */
  TRANSACTION_CHANGED: 'TransactionChanged',

  /**
   * When a budget is created, updated, or deleted
   */
  BUDGET_CHANGED: 'BudgetChanged',

  /**
   * When dashboard aggregations are refreshed
   */
  DASHBOARD_REFRESHED: 'DashboardRefreshed',

  /**
   * When a categorization rule is updated
   */
  CATEGORIZATION_CHANGED: 'CategorizationChanged',
} as const;
