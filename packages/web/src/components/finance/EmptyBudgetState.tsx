'use client';

import Link from 'next/link';
import { Wallet, TrendingUp, PieChart, ArrowRight } from 'lucide-react';

/**
 * Empty Budget State Component
 *
 * Shown when a user has not created any budgets yet.
 * Provides friendly onboarding UI with clear call-to-action.
 */
export function EmptyBudgetState() {
  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Main onboarding card */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-2xl text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <Wallet className="w-12 h-12 text-white" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to Finance Tracking!
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Let's set up your first budget to start tracking your expenses and take control of your finances.
          </p>

          {/* Features list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Track Spending</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor your daily expenses and stay within budget
              </p>
            </div>

            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3">
                <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Envelope Budgeting</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Allocate money to different categories
              </p>
            </div>

            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Insights</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get personalized recommendations
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/finance/budget/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Create Your First Budget
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/finance/help"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-colors text-lg"
            >
              Learn More
            </Link>
          </div>

          {/* Help text */}
          <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            Need help? Check out our{' '}
            <Link href="/finance/help/budget-guide" className="text-blue-600 dark:text-blue-400 hover:underline">
              budget guide
            </Link>
            {' '}to get started
          </p>
        </div>
      </div>
    </div>
  );
}
