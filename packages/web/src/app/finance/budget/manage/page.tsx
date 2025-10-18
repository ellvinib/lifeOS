'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { financeAPI, ExpenseCategory } from '@/lib/api/finance';

/**
 * Budget Management Page
 *
 * Allows users to create and edit monthly budgets with category allocations.
 * Uses envelope budgeting system where users allocate portions of their income
 * to different spending categories.
 */

// Category configuration with Dutch labels, emojis, and default percentages
const categoryConfig: Record<ExpenseCategory, {
  label: string;
  emoji: string;
  color: string;
  defaultPercentage: number;
  description: string;
}> = {
  [ExpenseCategory.GROCERIES]: {
    label: 'Boodschappen',
    emoji: '🛒',
    color: 'emerald',
    defaultPercentage: 20,
    description: 'Dagelijkse boodschappen en voeding'
  },
  [ExpenseCategory.DINING]: {
    label: 'Restaurants',
    emoji: '🍽️',
    color: 'orange',
    defaultPercentage: 10,
    description: 'Uit eten gaan en bezorgen'
  },
  [ExpenseCategory.TRANSPORTATION]: {
    label: 'Vervoer',
    emoji: '🚗',
    color: 'blue',
    defaultPercentage: 10,
    description: 'Brandstof, OV, parkeren'
  },
  [ExpenseCategory.ENTERTAINMENT]: {
    label: 'Entertainment',
    emoji: '🎮',
    color: 'purple',
    defaultPercentage: 8,
    description: 'Films, games, hobby\'s'
  },
  [ExpenseCategory.SHOPPING]: {
    label: 'Winkelen',
    emoji: '🛍️',
    color: 'pink',
    defaultPercentage: 12,
    description: 'Kleding, accessoires, cadeaus'
  },
  [ExpenseCategory.UTILITIES]: {
    label: 'Nutsvoorzieningen',
    emoji: '💡',
    color: 'yellow',
    defaultPercentage: 15,
    description: 'Gas, water, elektriciteit, internet'
  },
  [ExpenseCategory.HOUSING]: {
    label: 'Huisvesting',
    emoji: '🏠',
    color: 'indigo',
    defaultPercentage: 30,
    description: 'Huur, hypotheek, onderhoud'
  },
  [ExpenseCategory.HEALTHCARE]: {
    label: 'Gezondheidszorg',
    emoji: '⚕️',
    color: 'red',
    defaultPercentage: 8,
    description: 'Zorgverzekering, medicijnen, dokter'
  },
  [ExpenseCategory.OTHER]: {
    label: 'Overig',
    emoji: '📦',
    color: 'gray',
    defaultPercentage: 7,
    description: 'Overige uitgaven'
  },
};

interface CategoryAllocation {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
}

export default function BudgetManagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState<string>('3000');
  const [savingsGoal, setSavingsGoal] = useState<string>('600');
  const [budgetMonth, setBudgetMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // YYYY-MM format
  );

  // Initialize category allocations with default percentages
  const [allocations, setAllocations] = useState<CategoryAllocation[]>(
    Object.values(ExpenseCategory).map(category => ({
      category,
      amount: 0,
      percentage: categoryConfig[category].defaultPercentage,
    }))
  );

  // Calculate derived values
  const income = parseFloat(monthlyIncome) || 0;
  const savings = parseFloat(savingsGoal) || 0;
  const availableForBudget = income - savings;
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const remaining = availableForBudget - totalAllocated;

  // Update allocation amount based on percentage
  const updateAllocationPercentage = (category: ExpenseCategory, percentage: number) => {
    setAllocations(prev => prev.map(a =>
      a.category === category
        ? {
            ...a,
            percentage,
            amount: (availableForBudget * percentage) / 100
          }
        : a
    ));
  };

  // Update allocation amount directly
  const updateAllocationAmount = (category: ExpenseCategory, amount: number) => {
    setAllocations(prev => prev.map(a =>
      a.category === category
        ? {
            ...a,
            amount,
            percentage: availableForBudget > 0 ? (amount / availableForBudget) * 100 : 0
          }
        : a
    ));
  };

  // Auto-distribute remaining amount proportionally
  const distributeRemaining = () => {
    if (totalPercentage === 0) {
      // Use default percentages if none set
      setAllocations(prev => prev.map(a => ({
        ...a,
        percentage: categoryConfig[a.category].defaultPercentage,
        amount: (availableForBudget * categoryConfig[a.category].defaultPercentage) / 100,
      })));
    } else {
      // Scale up proportionally to 100%
      const scale = 100 / totalPercentage;
      setAllocations(prev => prev.map(a => ({
        ...a,
        percentage: a.percentage * scale,
        amount: (availableForBudget * a.percentage * scale) / 100,
      })));
    }
  };

  // Reset to default percentages
  const resetToDefaults = () => {
    setAllocations(prev => prev.map(a => ({
      ...a,
      percentage: categoryConfig[a.category].defaultPercentage,
      amount: (availableForBudget * categoryConfig[a.category].defaultPercentage) / 100,
    })));
  };

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      return financeAPI.budget.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      router.push('/finance');
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (income <= 0) {
      alert('Voer een geldig maandelijks inkomen in');
      return;
    }

    if (savings < 0 || savings >= income) {
      alert('Spaarddoel moet tussen €0 en je inkomen zijn');
      return;
    }

    if (Math.abs(totalPercentage - 100) > 0.1) {
      alert('Totale toewijzing moet 100% zijn. Gebruik "Verdeel Resterend" om automatisch aan te passen.');
      return;
    }

    const budgetData = {
      monthlyIncome: income,
      savingsGoal: savings,
      month: budgetMonth,
      categories: allocations.map(a => ({
        category: a.category,
        planned: a.amount,
      })),
    };

    createBudgetMutation.mutate(budgetData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              💰 Budget Beheren
            </h1>
            <p className="text-gray-600">
              Stel je maandbudget in en verdeel over categorieën
            </p>
          </div>
          <Link
            href="/finance"
            className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200
                     hover:bg-white/90 transition-all duration-200 text-gray-700 font-medium"
          >
            ← Terug
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Income & Savings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Income Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  📊 Inkomen & Sparen
                </h2>

                {/* Month Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maand
                  </label>
                  <input
                    type="month"
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2
                             focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Monthly Income */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maandelijks Inkomen
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">€</span>
                    <input
                      type="number"
                      step="0.01"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2
                               focus:ring-emerald-500 focus:border-transparent"
                      placeholder="3000.00"
                    />
                  </div>
                </div>

                {/* Savings Goal */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spaardoel
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">€</span>
                    <input
                      type="number"
                      step="0.01"
                      value={savingsGoal}
                      onChange={(e) => setSavingsGoal(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2
                               focus:ring-emerald-500 focus:border-transparent"
                      placeholder="600.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((savings / income) * 100).toFixed(1)}% van inkomen
                  </p>
                </div>

                {/* Available for Budget */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Beschikbaar voor Budget:</span>
                    <span className="text-xl font-bold text-emerald-600">
                      €{availableForBudget.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Samenvatting</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Totaal Toegewezen:</span>
                    <span className="font-semibold text-gray-900">€{totalAllocated.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Percentage:</span>
                    <span className={`font-semibold ${
                      Math.abs(totalPercentage - 100) < 0.1 ? 'text-green-600' :
                      totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {totalPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Resterend:</span>
                    <span className={`font-semibold ${
                      Math.abs(remaining) < 0.01 ? 'text-green-600' :
                      remaining < 0 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      €{remaining.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        Math.abs(totalPercentage - 100) < 0.1 ? 'bg-green-500' :
                        totalPercentage > 100 ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={distributeRemaining}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                             transition-colors duration-200 text-sm font-medium"
                  >
                    Verdeel Resterend
                  </button>
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600
                             transition-colors duration-200 text-sm font-medium"
                  >
                    Reset naar Standaard
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Category Allocations */}
            <div className="lg:col-span-2">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  🎯 Categorie Toewijzingen
                </h2>

                <div className="space-y-4">
                  {allocations.map((allocation) => {
                    const config = categoryConfig[allocation.category];
                    return (
                      <div key={allocation.category} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{config.emoji}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{config.label}</h3>
                              <p className="text-xs text-gray-500">{config.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">
                              €{allocation.amount.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {allocation.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Percentage Slider */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Percentage
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.5"
                              value={allocation.percentage}
                              onChange={(e) => updateAllocationPercentage(
                                allocation.category,
                                parseFloat(e.target.value)
                              )}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          {/* Amount Input */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Bedrag
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-500 text-sm">€</span>
                              <input
                                type="number"
                                step="0.01"
                                value={allocation.amount.toFixed(2)}
                                onChange={(e) => updateAllocationAmount(
                                  allocation.category,
                                  parseFloat(e.target.value) || 0
                                )}
                                className="w-full pl-6 pr-2 py-1.5 text-sm rounded-lg border border-gray-300
                                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end space-x-4">
                <Link
                  href="/finance"
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold
                           hover:bg-gray-300 transition-colors duration-200"
                >
                  Annuleren
                </Link>
                <button
                  type="submit"
                  disabled={createBudgetMutation.isPending || Math.abs(totalPercentage - 100) > 0.1}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold
                           hover:bg-emerald-600 transition-colors duration-200
                           disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {createBudgetMutation.isPending ? 'Opslaan...' : 'Budget Opslaan'}
                </button>
              </div>

              {createBudgetMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  Er is een fout opgetreden bij het opslaan van het budget. Probeer het opnieuw.
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
