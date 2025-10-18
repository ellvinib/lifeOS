'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Filter,
  Eye,
} from 'lucide-react';
import { financeAPI, ExpenseCategory, type Expense } from '@/lib/api/finance';
import { exportExpensesToCSV } from '@/lib/utils/export';

type ReportType = 'summary' | 'category_breakdown' | 'monthly_trend' | 'payment_method';

export default function FinancialReportsPage() {
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<ExpenseCategory[]>(
    Object.values(ExpenseCategory)
  );
  const [reportType, setReportType] = useState<ReportType>('summary');

  // Fetch expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', 'reports', startDate, endDate],
    queryFn: () =>
      financeAPI.expenses.getAll({
        startDate,
        endDate,
        limit: 10000, // Get all expenses in range
      }),
  });

  // Filter expenses by selected categories
  const filteredExpenses = useMemo(() => {
    if (!expensesData?.expenses) return [];
    return expensesData.expenses.filter((exp) =>
      selectedCategories.includes(exp.category as ExpenseCategory)
    );
  }, [expensesData, selectedCategories]);

  // Calculate report data
  const reportData = useMemo(() => {
    // Total amount
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Count
    const totalCount = filteredExpenses.length;

    // Average
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    // Category breakdown
    const categoryBreakdown: Record<
      string,
      { total: number; count: number; percentage: number }
    > = {};
    filteredExpenses.forEach((exp) => {
      if (!categoryBreakdown[exp.category]) {
        categoryBreakdown[exp.category] = { total: 0, count: 0, percentage: 0 };
      }
      categoryBreakdown[exp.category].total += exp.amount;
      categoryBreakdown[exp.category].count += 1;
    });
    Object.keys(categoryBreakdown).forEach((cat) => {
      categoryBreakdown[cat].percentage =
        totalAmount > 0 ? (categoryBreakdown[cat].total / totalAmount) * 100 : 0;
    });

    // Monthly trend
    const monthlyTrend: Record<string, { total: number; count: number }> = {};
    filteredExpenses.forEach((exp) => {
      const month = exp.date.substring(0, 7); // YYYY-MM
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = { total: 0, count: 0 };
      }
      monthlyTrend[month].total += exp.amount;
      monthlyTrend[month].count += 1;
    });

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { total: number; count: number }> = {};
    filteredExpenses.forEach((exp) => {
      if (!paymentMethodBreakdown[exp.paymentMethod]) {
        paymentMethodBreakdown[exp.paymentMethod] = { total: 0, count: 0 };
      }
      paymentMethodBreakdown[exp.paymentMethod].total += exp.amount;
      paymentMethodBreakdown[exp.paymentMethod].count += 1;
    });

    return {
      totalAmount,
      totalCount,
      averageAmount,
      categoryBreakdown,
      monthlyTrend,
      paymentMethodBreakdown,
    };
  }, [filteredExpenses]);

  // Category labels
  const categoryLabels: Record<ExpenseCategory, { label: string; emoji: string; color: string }> = {
    [ExpenseCategory.GROCERIES]: { label: 'Groceries', emoji: '🛒', color: 'emerald' },
    [ExpenseCategory.DINING]: { label: 'Dining', emoji: '🍽️', color: 'orange' },
    [ExpenseCategory.TRANSPORTATION]: { label: 'Transportation', emoji: '🚗', color: 'blue' },
    [ExpenseCategory.ENTERTAINMENT]: { label: 'Entertainment', emoji: '🎮', color: 'purple' },
    [ExpenseCategory.SHOPPING]: { label: 'Shopping', emoji: '🛍️', color: 'pink' },
    [ExpenseCategory.UTILITIES]: { label: 'Utilities', emoji: '💡', color: 'yellow' },
    [ExpenseCategory.HOUSING]: { label: 'Housing', emoji: '🏠', color: 'indigo' },
    [ExpenseCategory.HEALTHCARE]: { label: 'Healthcare', emoji: '⚕️', color: 'red' },
    [ExpenseCategory.OTHER]: { label: 'Other', emoji: '📦', color: 'gray' },
  };

  const toggleCategory = (category: ExpenseCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleExport = () => {
    exportExpensesToCSV(filteredExpenses);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/finance"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
            </div>
            <button
              onClick={handleExport}
              disabled={filteredExpenses.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Configuration Panel */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="summary">Summary Overview</option>
                <option value="category_breakdown">Category Breakdown</option>
                <option value="monthly_trend">Monthly Trend</option>
                <option value="payment_method">Payment Methods</option>
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryLabels).map(([key, { label, emoji }]) => (
                <button
                  key={key}
                  onClick={() => toggleCategory(key as ExpenseCategory)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all ${
                    selectedCategories.includes(key as ExpenseCategory)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Generating report...</p>
          </div>
        )}

        {/* Summary Report */}
        {!isLoading && reportType === 'summary' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Total Spent
                  </h3>
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  €{reportData.totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Total Transactions
                  </h3>
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {reportData.totalCount}
                </p>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Average Transaction
                  </h3>
                  <PieChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  €{reportData.averageAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Top Spending Categories
              </h3>
              <div className="space-y-3">
                {Object.entries(reportData.categoryBreakdown)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .slice(0, 5)
                  .map(([category, data]) => (
                    <div key={category} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-2xl">
                          {categoryLabels[category as ExpenseCategory].emoji}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {categoryLabels[category as ExpenseCategory].label}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {data.count} transactions
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                                style={{ width: `${data.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">
                              {data.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          €{data.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* Category Breakdown Report */}
        {!isLoading && reportType === 'category_breakdown' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-gray-700/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Transactions
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Average
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.categoryBreakdown)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([category, data]) => (
                      <tr
                        key={category}
                        className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-white/30 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {categoryLabels[category as ExpenseCategory].emoji}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {categoryLabels[category as ExpenseCategory].label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                          €{data.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">
                          €{(data.total / data.count).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold">
                            {data.percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Trend Report */}
        {!isLoading && reportType === 'monthly_trend' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-gray-700/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Month
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Transactions
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Daily Average
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.monthlyTrend)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, data]) => {
                      const daysInMonth = new Date(
                        parseInt(month.split('-')[0]),
                        parseInt(month.split('-')[1]),
                        0
                      ).getDate();
                      return (
                        <tr
                          key={month}
                          className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-white/30 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                            {new Date(month + '-01').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                            {data.count}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                            €{data.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">
                            €{(data.total / daysInMonth).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Method Report */}
        {!isLoading && reportType === 'payment_method' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-gray-700/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Payment Method
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Transactions
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.paymentMethodBreakdown)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([method, data]) => (
                      <tr
                        key={method}
                        className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-white/30 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {method.charAt(0).toUpperCase() +
                            method.slice(1).replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                          €{data.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">
                          €{(data.total / data.count).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredExpenses.length === 0 && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <Eye className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No data for this period
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your date range or category filters to see expenses
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
