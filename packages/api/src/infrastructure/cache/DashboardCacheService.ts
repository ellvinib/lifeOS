import { ICacheService } from './ICacheService';
import { CacheKeys, CacheTTL } from './CacheKeys';

/**
 * Dashboard Cache Service
 *
 * Specialized cache service for dashboard data with automatic invalidation
 */
export class DashboardCacheService {
  constructor(private readonly cache: ICacheService) {}

  /**
   * Get dashboard data from cache
   *
   * @param userId - User ID
   * @param month - Month (optional, defaults to current)
   */
  async getDashboard(userId: string, month?: string): Promise<any | null> {
    const key = CacheKeys.dashboard(userId, month);
    return this.cache.get(key);
  }

  /**
   * Set dashboard data in cache
   *
   * @param userId - User ID
   * @param month - Month (optional, defaults to current)
   * @param data - Dashboard data
   */
  async setDashboard(userId: string, month: string | undefined, data: any): Promise<void> {
    const key = CacheKeys.dashboard(userId, month);
    await this.cache.set(key, data, { ttl: CacheTTL.DASHBOARD });
  }

  /**
   * Get monthly summary from cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   */
  async getMonthlySummary(userId: string, month: string): Promise<any | null> {
    const key = CacheKeys.monthlySummary(userId, month);
    return this.cache.get(key);
  }

  /**
   * Set monthly summary in cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   * @param data - Monthly summary data
   */
  async setMonthlySummary(userId: string, month: string, data: any): Promise<void> {
    const key = CacheKeys.monthlySummary(userId, month);
    await this.cache.set(key, data, { ttl: CacheTTL.MONTHLY_SUMMARY });
  }

  /**
   * Get category totals from cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   */
  async getCategoryTotals(userId: string, month: string): Promise<any[] | null> {
    const key = CacheKeys.categoryTotals(userId, month);
    return this.cache.get(key);
  }

  /**
   * Set category totals in cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   * @param data - Category totals data
   */
  async setCategoryTotals(userId: string, month: string, data: any[]): Promise<void> {
    const key = CacheKeys.categoryTotals(userId, month);
    await this.cache.set(key, data, { ttl: CacheTTL.CATEGORY_STATS });
  }

  /**
   * Get spending distribution from cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   */
  async getSpendingDistribution(userId: string, month: string): Promise<any[] | null> {
    const key = CacheKeys.spendingDistribution(userId, month);
    return this.cache.get(key);
  }

  /**
   * Set spending distribution in cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   * @param data - Spending distribution data
   */
  async setSpendingDistribution(
    userId: string,
    month: string,
    data: any[]
  ): Promise<void> {
    const key = CacheKeys.spendingDistribution(userId, month);
    await this.cache.set(key, data, { ttl: CacheTTL.CATEGORY_STATS });
  }

  /**
   * Get over-budget categories from cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   */
  async getOverBudgetCategories(userId: string, month: string): Promise<any[] | null> {
    const key = CacheKeys.overBudgetCategories(userId, month);
    return this.cache.get(key);
  }

  /**
   * Set over-budget categories in cache
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   * @param data - Over-budget categories data
   */
  async setOverBudgetCategories(
    userId: string,
    month: string,
    data: any[]
  ): Promise<void> {
    const key = CacheKeys.overBudgetCategories(userId, month);
    await this.cache.set(key, data, { ttl: CacheTTL.CATEGORY_STATS });
  }

  /**
   * Get dashboard comparison data from cache
   *
   * @param userId - User ID
   * @param currentMonth - Current month (YYYY-MM format)
   * @param previousMonth - Previous month (YYYY-MM format)
   */
  async getDashboardComparison(
    userId: string,
    currentMonth: string,
    previousMonth: string
  ): Promise<any | null> {
    const key = CacheKeys.dashboardComparison(userId, currentMonth, previousMonth);
    return this.cache.get(key);
  }

  /**
   * Set dashboard comparison data in cache
   *
   * @param userId - User ID
   * @param currentMonth - Current month (YYYY-MM format)
   * @param previousMonth - Previous month (YYYY-MM format)
   * @param data - Comparison data
   */
  async setDashboardComparison(
    userId: string,
    currentMonth: string,
    previousMonth: string,
    data: any
  ): Promise<void> {
    const key = CacheKeys.dashboardComparison(userId, currentMonth, previousMonth);
    await this.cache.set(key, data, { ttl: CacheTTL.DASHBOARD });
  }

  /**
   * Get dashboard trends data from cache
   *
   * @param userId - User ID
   * @param months - Number of months (default: 6)
   */
  async getDashboardTrends(userId: string, months: number = 6): Promise<any | null> {
    const key = CacheKeys.dashboardTrends(userId, months);
    return this.cache.get(key);
  }

  /**
   * Set dashboard trends data in cache
   *
   * @param userId - User ID
   * @param months - Number of months
   * @param data - Trends data
   */
  async setDashboardTrends(userId: string, months: number, data: any): Promise<void> {
    const key = CacheKeys.dashboardTrends(userId, months);
    await this.cache.set(key, data, { ttl: CacheTTL.DASHBOARD });
  }

  /**
   * Get forecast data from cache
   *
   * @param userId - User ID
   * @param months - Number of months to forecast (default: 3)
   */
  async getForecast(userId: string, months: number = 3): Promise<any | null> {
    const key = CacheKeys.forecast(userId, months);
    return this.cache.get(key);
  }

  /**
   * Set forecast data in cache
   *
   * @param userId - User ID
   * @param months - Number of months to forecast
   * @param data - Forecast data
   */
  async setForecast(userId: string, months: number, data: any): Promise<void> {
    const key = CacheKeys.forecast(userId, months);
    await this.cache.set(key, data, { ttl: CacheTTL.FORECAST });
  }

  /**
   * Invalidate all dashboard cache for a user
   *
   * This should be called when:
   * - A transaction is created, updated, or deleted
   * - A budget is changed
   * - Dashboard is manually refreshed
   *
   * @param userId - User ID
   */
  async invalidateDashboardCache(userId: string): Promise<void> {
    await Promise.all([
      this.cache.deletePattern(CacheKeys.dashboardPattern(userId)),
      this.cache.deletePattern(CacheKeys.monthlySummaryPattern(userId)),
      this.cache.deletePattern(CacheKeys.categoryTotalsPattern(userId)),
    ]);
  }

  /**
   * Invalidate monthly summary cache for a specific month
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   */
  async invalidateMonthlySummary(userId: string, month: string): Promise<void> {
    await this.cache.delete(CacheKeys.monthlySummary(userId, month));
  }

  /**
   * Invalidate category totals cache for a specific month
   *
   * @param userId - User ID
   * @param month - Month (YYYY-MM format)
   */
  async invalidateCategoryTotals(userId: string, month: string): Promise<void> {
    await this.cache.delete(CacheKeys.categoryTotals(userId, month));
  }

  /**
   * Invalidate transaction cache for a user
   *
   * @param userId - User ID
   */
  async invalidateTransactionCache(userId: string): Promise<void> {
    await this.cache.deletePattern(CacheKeys.transactionsPattern(userId));
  }

  /**
   * Invalidate forecast cache for a user
   *
   * @param userId - User ID
   */
  async invalidateForecastCache(userId: string): Promise<void> {
    // Delete all forecast variations
    for (let months = 1; months <= 12; months++) {
      await this.cache.delete(CacheKeys.forecast(userId, months));
    }
  }

  /**
   * Invalidate all cache for a user
   *
   * Nuclear option - use sparingly
   *
   * @param userId - User ID
   */
  async invalidateAllUserCache(userId: string): Promise<void> {
    await this.cache.deletePattern(CacheKeys.userPattern(userId));
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    dashboardKeys: number;
    summaryKeys: number;
    categoryKeys: number;
  }> {
    // This is a simplified version - in production, you'd use Redis INFO command
    return {
      totalKeys: 0,
      dashboardKeys: 0,
      summaryKeys: 0,
      categoryKeys: 0,
    };
  }
}
