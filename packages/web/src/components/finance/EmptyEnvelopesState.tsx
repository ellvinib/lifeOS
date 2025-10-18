'use client';

import Link from 'next/link';
import { Folders, TrendingUp, Target } from 'lucide-react';

/**
 * Empty Envelopes State Component
 *
 * Shown when a user has no budget envelopes created.
 * Explains the envelope budgeting concept with clear call-to-action.
 */
export function EmptyEnvelopesState() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6 shadow-lg">
            <Folders className="w-10 h-10 text-white" />
          </div>

          {/* Heading */}
          <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            No Budget Envelopes Yet
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Envelopes help you allocate your budget across different categories like groceries, transport, and entertainment.
          </p>

          {/* Benefits grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-left p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                Stay on Track
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Know exactly how much you can spend per category
              </p>
            </div>

            <div className="text-left p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-pink-600 dark:text-pink-400 mb-2" />
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                Prevent Overspending
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Visual alerts when approaching limits
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            href="/finance/budget/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Set Up Budget Envelopes
          </Link>

          {/* Help link */}
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/finance/help/envelope-budgeting" className="text-purple-600 dark:text-purple-400 hover:underline">
              Learn about envelope budgeting
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
