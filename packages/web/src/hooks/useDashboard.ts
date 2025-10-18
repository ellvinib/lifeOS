'use client';

import { useQuery, useMutation } from '@apollo/client';
import {
  GET_DASHBOARD,
  GET_MONTHLY_SUMMARY,
  GET_SPENDING_DISTRIBUTION,
  REFRESH_DASHBOARD,
} from '../lib/graphql/dashboard.queries';
import type { DashboardData, MonthlySummary, CategoryDistribution } from '../types/dashboard';

/**
 * Hook to fetch complete dashboard data
 */
export function useDashboard(
  userId: string,
  options?: {
    month?: string;
    includeComparison?: boolean;
    includeTrends?: boolean;
  }
) {
  const { data, loading, error, refetch } = useQuery<{ getDashboard: DashboardData }>(
    GET_DASHBOARD,
    {
      variables: {
        userId,
        month: options?.month,
        includeComparison: options?.includeComparison ?? true,
        includeTrends: options?.includeTrends ?? true,
      },
      pollInterval: 60000, // Refresh every minute
    }
  );

  return {
    dashboard: data?.getDashboard,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch monthly summary
 */
export function useMonthlySummary(userId: string, month: string) {
  const { data, loading, error } = useQuery<{ getMonthlySummary: MonthlySummary }>(
    GET_MONTHLY_SUMMARY,
    {
      variables: { userId, month },
    }
  );

  return {
    summary: data?.getMonthlySummary,
    loading,
    error,
  };
}

/**
 * Hook to fetch spending distribution
 */
export function useSpendingDistribution(userId: string, month: string) {
  const { data, loading, error } = useQuery<{
    getSpendingDistribution: CategoryDistribution[];
  }>(GET_SPENDING_DISTRIBUTION, {
    variables: { userId, month },
  });

  return {
    distribution: data?.getSpendingDistribution || [],
    loading,
    error,
  };
}

/**
 * Hook to manually refresh dashboard
 */
export function useRefreshDashboard() {
  const [refreshDashboard, { loading, error }] = useMutation(REFRESH_DASHBOARD);

  const refresh = async (
    userId: string,
    options?: {
      month?: string;
      forceRecalculation?: boolean;
    }
  ) => {
    return refreshDashboard({
      variables: {
        userId,
        ...options,
      },
    });
  };

  return {
    refresh,
    loading,
    error,
  };
}
