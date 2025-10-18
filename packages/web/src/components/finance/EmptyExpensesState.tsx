'use client';

import Link from 'next/link';
import { Receipt, Plus, Sparkles } from 'lucide-react';

/**
 * Empty Expenses State Component
 *
 * Shown when a user has not recorded any expenses yet.
 * Provides friendly UI with clear call-to-action to add first expense.
 */
export function EmptyExpensesState() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 shadow-lg">
          <Receipt className="w-10 h-10 text-white" />
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
          No Expenses Yet
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Start tracking your spending by recording your first expense. Every euro counts!
        </p>

        {/* Quick tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Quick Tip</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Record expenses as soon as they happen to maintain accurate tracking
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/finance/expenses/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Add Your First Expense
        </Link>
      </div>
    </div>
  );
}
