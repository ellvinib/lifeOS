'use client';

import { useDashboard, useSpendingDistribution } from '../../hooks/useDashboard';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { SpendingPieChart } from '../../components/dashboard/SpendingPieChart';
import { TrendLineChart } from '../../components/dashboard/TrendLineChart';

/**
 * Dashboard Page
 *
 * Main financial dashboard with summary cards, charts, and trends
 */
export default function DashboardPage() {
  const userId = 'user-123'; // TODO: Get from auth context
  const currentMonth = new Date().toISOString().slice(0, 10);

  const { dashboard, loading, error } = useDashboard(userId, {
    includeComparison: true,
    includeTrends: true,
  });

  const { distribution } = useSpendingDistribution(userId, currentMonth);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error loading dashboard</h3>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  const { currentMonth: current, comparison, trends } = dashboard;
  const summary = current.summary;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your financial health
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Income"
            value={formatCurrency(summary.totalIncome)}
            trend={
              comparison
                ? {
                    value: comparison.incomePercentChange,
                    isPositive: comparison.incomeDelta >= 0,
                  }
                : undefined
            }
          />

          <SummaryCard
            title="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
            trend={
              comparison
                ? {
                    value: comparison.expensesPercentChange,
                    isPositive: comparison.expensesDelta < 0, // Lower expenses is positive
                  }
                : undefined
            }
          />

          <SummaryCard
            title="Net Cash Flow"
            value={formatCurrency(summary.netCashFlow)}
            description={
              summary.netCashFlow >= 0 ? 'Positive balance' : 'Negative balance'
            }
            trend={
              comparison
                ? {
                    value: Math.abs(
                      ((comparison.netCashFlowDelta / comparison.previousMonth.netCashFlow) *
                        100) ||
                        0
                    ),
                    isPositive: comparison.netCashFlowDelta >= 0,
                  }
                : undefined
            }
          />

          <SummaryCard
            title="Savings Rate"
            value={`${summary.savingsRate.toFixed(1)}%`}
            description={`${summary.transactionCount} transactions`}
            trend={
              comparison
                ? {
                    value: Math.abs(comparison.savingsRateDelta),
                    isPositive: comparison.savingsRateDelta >= 0,
                  }
                : undefined
            }
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SpendingPieChart data={distribution} />

          {trends && <TrendLineChart data={trends.summaries} />}
        </div>

        {/* Budget Alerts */}
        {current.overBudgetCategories.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-900 mb-4">
              ⚠️ Budget Alerts
            </h3>
            <div className="space-y-3">
              {current.overBudgetCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between bg-white p-4 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{category.category}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(category.totalAmount)} /{' '}
                      {formatCurrency(category.budgetAmount || 0)} budget
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      {category.budgetUsedPercent?.toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">used</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Spending Categories
          </h3>
          <div className="space-y-4">
            {current.topCategories.map((category) => (
              <div key={category.id} className="flex items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {category.category}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(category.totalAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${category.percentOfTotal}%` }}
                    />
                  </div>
                </div>
                <span className="ml-4 text-sm font-medium text-gray-500">
                  {category.percentOfTotal.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
