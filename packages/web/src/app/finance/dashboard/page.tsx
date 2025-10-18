'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Calendar,
  PieChart,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { financeGraphQL } from '@/lib/graphql/finance';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { EmptyBudgetState } from '@/components/finance/EmptyBudgetState';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';

/**
 * Finance Dashboard Page
 *
 * Comprehensive analytics dashboard using GraphQL queries:
 * - getDashboard: Complete dashboard data with comparison and trends
 * - getCategoryTrend: Category spending trends
 * - getOverBudgetCategories: Over-budget alerts
 */
export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch complete dashboard data
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-dashboard', user?.id, selectedMonth],
    queryFn: () =>
      financeGraphQL.getDashboard({
        userId: user?.id || '',
        month: `${selectedMonth}-01`,
        includeComparison: true,
        includeTrends: true,
      }),
    enabled: !!user?.id,
  });

  // Navigate months
  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Don't go beyond current month
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    if (nextMonth <= currentMonth) {
      setSelectedMonth(nextMonth);
    }
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    await financeGraphQL.refreshDashboard({
      userId: user.id,
      month: `${selectedMonth}-01`,
      forceRecalculation: true,
    });
    refetch();
  };

  // Format month display
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  };

  // Category icons and colors
  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { icon: string; color: string; bgColor: string }> = {
      groceries: { icon: '🛒', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
      housing: { icon: '🏠', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
      transportation: { icon: '🚗', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
      utilities: { icon: '⚡', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
      entertainment: { icon: '🎮', color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
      healthcare: { icon: '🏥', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' },
      education: { icon: '📚', color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
      dining_out: { icon: '🍽️', color: 'text-pink-600', bgColor: 'bg-pink-50 dark:bg-pink-900/20' },
      other: { icon: '📦', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20' },
    };
    return configs[category] || configs.other;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Laden dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <p>Fout bij laden dashboard: {error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <EmptyBudgetState />
        </div>
      </ProtectedRoute>
    );
  }

  const { currentMonth, comparison, trends } = dashboard;

  // Check for empty budget state (totalBudget = 0 means no budget set up)
  if (currentMonth?.summary?.totalBudget === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <EmptyBudgetState />
        </div>
      </ProtectedRoute>
    );
  }
  const { summary, categoryTotals, topCategories, overBudgetCategories } = currentMonth;

  return (
    <ProtectedRoute>
      <FinanceErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Financieel Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Overzicht van je financiële situatie
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Month selector */}
            <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-2 border border-white/50 dark:border-gray-700/50 shadow-lg">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="px-4 py-2 flex items-center gap-2 min-w-[180px] justify-center">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatMonthDisplay(selectedMonth)}
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Ververs</span>
            </button>
          </div>
        </div>

        {/* Over-Budget Alerts */}
        {overBudgetCategories.length > 0 && (
          <div className="bg-red-50/60 dark:bg-red-900/20 backdrop-blur-xl rounded-2xl p-6 border border-red-200 dark:border-red-800 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
                  Budget waarschuwingen ({overBudgetCategories.length})
                </h3>
                <div className="space-y-3">
                  {overBudgetCategories.map((cat) => {
                    const config = getCategoryConfig(cat.category);
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between bg-white/60 dark:bg-gray-800/60 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{config.icon}</span>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {cat.category.charAt(0).toUpperCase() + cat.category.slice(1).replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {cat.budgetUsedPercent?.toFixed(0)}% van budget gebruikt
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 dark:text-red-400">
                            €{cat.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            van €{cat.budgetAmount?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Income */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              {comparison && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    comparison.incomePercentChange >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {comparison.incomePercentChange >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {Math.abs(comparison.incomePercentChange).toFixed(1)}%
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Totaal inkomen
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              €{summary.totalIncome.toFixed(2)}
            </p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              {comparison && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    comparison.expensesPercentChange <= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {comparison.expensesPercentChange >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {Math.abs(comparison.expensesPercentChange).toFixed(1)}%
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Totaal uitgaven
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              €{summary.totalExpenses.toFixed(2)}
            </p>
          </div>

          {/* Net Cash Flow */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 rounded-xl ${
                  summary.netCashFlow >= 0
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}
              >
                <DollarSign
                  className={`w-6 h-6 ${
                    summary.netCashFlow >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                />
              </div>
              {comparison && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    comparison.netCashFlowDelta >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {comparison.netCashFlowDelta >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  €{Math.abs(comparison.netCashFlowDelta).toFixed(2)}
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Netto cashflow
            </h3>
            <p
              className={`text-3xl font-bold ${
                summary.netCashFlow >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              €{summary.netCashFlow.toFixed(2)}
            </p>
          </div>

          {/* Savings Rate */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              {comparison && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    comparison.savingsRateDelta >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {comparison.savingsRateDelta >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {Math.abs(comparison.savingsRateDelta * 100).toFixed(1)}%
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Spaarquote
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {(summary.savingsRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Month-over-Month Comparison */}
        {comparison && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Maand-op-maand vergelijking
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vergelijking met {new Date(comparison.previousMonth.month).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Income comparison */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Inkomen delta
                </p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.incomeDelta >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {comparison.incomeDelta >= 0 ? '+' : ''}€{comparison.incomeDelta.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {comparison.incomePercentChange >= 0 ? '+' : ''}
                  {comparison.incomePercentChange.toFixed(1)}% vs vorige maand
                </p>
              </div>

              {/* Expenses comparison */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Uitgaven delta
                </p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.expensesDelta >= 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {comparison.expensesDelta >= 0 ? '+' : ''}€{comparison.expensesDelta.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {comparison.expensesPercentChange >= 0 ? '+' : ''}
                  {comparison.expensesPercentChange.toFixed(1)}% vs vorige maand
                </p>
              </div>

              {/* Net cashflow comparison */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Netto cashflow delta
                </p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.netCashFlowDelta >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {comparison.netCashFlowDelta >= 0 ? '+' : ''}€
                  {comparison.netCashFlowDelta.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Spaarquote: {comparison.savingsRateDelta >= 0 ? '+' : ''}
                  {(comparison.savingsRateDelta * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Categories */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Top uitgaven categorieën
          </h2>
          <div className="space-y-4">
            {topCategories.map((cat) => {
              const config = getCategoryConfig(cat.category);
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {cat.category.charAt(0).toUpperCase() + cat.category.slice(1).replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {cat.transactionCount} transacties
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        €{cat.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {cat.percentOfTotal.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${config.bgColor} ${config.color} transition-all duration-500`}
                      style={{ width: `${cat.percentOfTotal}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trend Chart */}
        {trends && trends.summaries.length > 1 && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Trend analyse
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Afgelopen {trends.summaries.length} maanden
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Gemiddeld inkomen
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  €{trends.averageIncome.toFixed(2)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      trends.incomeGrowthRate >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {trends.incomeGrowthRate >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {trends.incomeGrowthRate.toFixed(1)}% groei
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Gemiddeld uitgaven
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  €{trends.averageExpenses.toFixed(2)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      trends.expensesGrowthRate <= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {trends.expensesGrowthRate >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(trends.expensesGrowthRate).toFixed(1)}% groei
                  </div>
                </div>
              </div>
            </div>

            {/* Simple bar chart visualization */}
            <div className="space-y-3">
              {trends.summaries.slice(-6).map((monthSummary) => {
                const monthName = new Date(monthSummary.month).toLocaleDateString('nl-NL', {
                  month: 'short',
                  year: 'numeric',
                });
                const maxValue = Math.max(
                  ...trends.summaries.map((s) => Math.max(s.totalIncome, s.totalExpenses))
                );
                const incomePercent = (monthSummary.totalIncome / maxValue) * 100;
                const expensesPercent = (monthSummary.totalExpenses / maxValue) * 100;

                return (
                  <div key={monthSummary.month}>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      {monthName}
                    </p>
                    <div className="space-y-2">
                      {/* Income bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20">
                          Inkomen
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                            style={{ width: `${incomePercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white w-24 text-right">
                          €{monthSummary.totalIncome.toFixed(0)}
                        </span>
                      </div>
                      {/* Expenses bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20">
                          Uitgaven
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                            style={{ width: `${expensesPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white w-24 text-right">
                          €{monthSummary.totalExpenses.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/finance/expenses"
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Uitgaven</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bekijk alle uitgaven
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/finance/budget/manage"
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Budget</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Beheer je budget
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/finance/reports"
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Rapporten</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gedetailleerde rapporten
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
      </FinanceErrorBoundary>
    </ProtectedRoute>
  );
}
