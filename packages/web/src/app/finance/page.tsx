'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Plus, TrendingUp, Wallet, Calendar,
  Zap, ShoppingBag, CreditCard, Target, Award, Flame
} from 'lucide-react';
import { QuickAddExpenseModal } from '@/components/finance/QuickAddExpenseModal';
import { PrePurchaseCheck } from '@/components/finance/PrePurchaseCheck';
import { financeAPI } from '@/lib/api/finance';

export default function FinancePage() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPrePurchaseCheck, setShowPrePurchaseCheck] = useState(false);
  const queryClient = useQueryClient();

  // Fetch today's budget data
  const {
    data: todayBudget,
    isLoading: loadingToday,
    error: errorToday
  } = useQuery({
    queryKey: ['budget', 'today'],
    queryFn: () => financeAPI.budget.getToday(),
  });

  // Fetch envelopes data
  const {
    data: envelopesData,
    isLoading: loadingEnvelopes,
    error: errorEnvelopes
  } = useQuery({
    queryKey: ['budget', 'envelopes'],
    queryFn: () => financeAPI.budget.getEnvelopes(),
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: financeAPI.expenses.create,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const today = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Mock streak and level data (will be implemented later)
  const dailyData = {
    remainingToday: todayBudget?.remainingToday ?? 0,
    dailyLimit: todayBudget?.dailyLimit ?? 0,
    percentUsed: todayBudget?.percentUsed ?? 0,
    streak: 7, // TODO: Fetch from backend
    level: 3, // TODO: Fetch from backend
    nextLevelProgress: 65, // TODO: Fetch from backend
  };

  // Map envelopes data with colors
  const getEnvelopeColor = (category: string) => {
    const colorMap: Record<string, string> = {
      groceries: 'from-emerald-400 to-emerald-600',
      dining: 'from-orange-400 to-orange-600',
      transportation: 'from-blue-400 to-blue-600',
      entertainment: 'from-purple-400 to-purple-600',
      shopping: 'from-pink-400 to-pink-600',
      utilities: 'from-yellow-400 to-yellow-600',
      housing: 'from-indigo-400 to-indigo-600',
      healthcare: 'from-red-400 to-red-600',
    };
    return colorMap[category] || 'from-gray-400 to-gray-600';
  };

  const envelopes = envelopesData?.envelopes.slice(0, 4).map(env => ({
    name: env.name,
    emoji: env.emoji,
    current: env.remaining,
    total: env.planned,
    percentage: env.percentage,
    color: getEnvelopeColor(env.category),
    status: env.status,
  })) || [];

  // Get recent transactions from envelopes
  const recentTransactions = envelopesData?.envelopes
    .flatMap(env => env.recentTransactions.map(tx => ({
      description: tx.description,
      amount: tx.amount,
      category: env.name,
      time: formatRelativeTime(new Date(tx.date)),
    })))
    .slice(0, 3) || [];

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Zojuist';
    if (diffInHours < 24) return `${diffInHours}u geleden`;
    if (diffInHours < 48) return 'Gisteren';
    return `${Math.floor(diffInHours / 24)} dagen geleden`;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-emerald-500';
      case 'warning': return 'bg-orange-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Loading state
  if (loadingToday || loadingEnvelopes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-96 bg-white/60 dark:bg-gray-800/60 rounded-3xl mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="h-24 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
              <div className="h-24 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (errorToday || errorEnvelopes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
              Er ging iets mis
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {(errorToday as Error)?.message || (errorEnvelopes as Error)?.message || 'Kon geen gegevens laden'}
            </p>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['budget'] });
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Minimal Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                ← Terug
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance</h1>
            </div>

            {/* Streak & Level Badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                <Flame className="w-4 h-4" />
                <span>{dailyData.streak} dagen</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                <Award className="w-4 h-4" />
                <span>Level {dailyData.level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* TODAY VIEW - Hero Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2 capitalize">{today}</p>
            <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg px-4 py-2 rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {dailyData.streak}-daagse logging streak
              </span>
            </div>
          </div>

          {/* Main Daily Budget Card - Glassmorphism */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-3xl blur-2xl opacity-20"></div>
            <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-12 border border-white/50 dark:border-gray-700/50 shadow-2xl">
              <div className="text-center">
                <p className="text-2xl font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Je hebt nog
                </p>
                <div className="mb-4">
                  <span className="text-8xl font-bold bg-gradient-to-br from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                    €{dailyData.remainingToday}
                  </span>
                </div>
                <p className="text-2xl font-medium text-gray-700 dark:text-gray-300 mb-6">
                  te besteden vandaag
                </p>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto mb-6">
                  <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-3 backdrop-blur-sm">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${dailyData.percentUsed}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{dailyData.percentUsed}% van dag gebruikt</span>
                    <span>€{dailyData.dailyLimit} dagelijkse limiet</span>
                  </div>
                </div>

                {/* Context Helpers */}
                <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/50 dark:border-gray-600/50">
                    Genoeg voor: Diner (€25) + Boodschappen (€22)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Quick Add Expense */}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Snelle uitgave</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Log een aankoop in &lt; 5 sec</p>
              </div>
            </div>
          </button>

          {/* Pre-Purchase Check */}
          <button
            onClick={() => setShowPrePurchaseCheck(true)}
            className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Kan ik dit betalen?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Check voor je koopt</p>
              </div>
            </div>
          </button>

          {/* Bank Sync */}
          <Link
            href="/finance/bank/connect"
            className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Bankkoppeling</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Automatische sync</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Budget Envelopes - Glassmorphism Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Enveloppen</h2>
            <Link href="/finance/envelopes" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Alles bekijken →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {envelopes.map((envelope, idx) => (
              <div
                key={idx}
                className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
              >
                {/* Status Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{envelope.emoji}</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(envelope.status)} shadow-lg`}></div>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{envelope.name}</h3>

                <div className="mb-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{envelope.current}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      / €{envelope.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2 backdrop-blur-sm">
                    <div
                      className={`bg-gradient-to-r ${envelope.color} h-2 rounded-full transition-all duration-500 shadow-md ${
                        envelope.percentage >= 90 ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${envelope.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{envelope.percentage}% gebruikt</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    €{envelope.total - envelope.current} over
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recente transacties</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Alles bekijken →
            </button>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((tx, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/70 dark:hover:bg-gray-700/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tx.category} • {tx.time}</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-lg">
                  €{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-300/50 dark:border-purple-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Level {dailyData.level} - Budget Beginner</h3>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">{dailyData.nextLevelProgress}% naar Level {dailyData.level + 1}</span>
          </div>
          <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-3 backdrop-blur-sm">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${dailyData.nextLevelProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Log nog 7 dagen achter elkaar om Level 4 te bereiken en het "Discipline Master" badge te ontgrendelen!
          </p>
        </div>
      </div>

      {/* Quick Add Expense Modal */}
      <QuickAddExpenseModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSubmit={async (expense) => {
          try {
            await createExpenseMutation.mutateAsync({
              description: expense.description || 'Quick expense',
              amount: expense.amount,
              category: expense.category as any,
              date: new Date(expense.date).toISOString(),
              paymentMethod: expense.paymentMethod as any,
            });
            setShowQuickAdd(false);
            // TODO: Show success toast with celebration animation
          } catch (error) {
            console.error('Failed to create expense:', error);
            // TODO: Show error toast
          }
        }}
        isLoading={createExpenseMutation.isPending}
      />

      {/* Pre-Purchase Check Modal */}
      <PrePurchaseCheck
        isOpen={showPrePurchaseCheck}
        onClose={() => setShowPrePurchaseCheck(false)}
        onProceedToLog={(amount, category) => {
          setShowPrePurchaseCheck(false);
          setShowQuickAdd(true);
          // TODO: Pre-fill the Quick Add modal with amount and category
        }}
        currentDailyRemaining={dailyData.remainingToday}
        envelopes={envelopes}
      />
    </div>
  );
}
