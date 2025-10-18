'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, TrendingDown, TrendingUp, Calendar,
  DollarSign, Settings, History, Target, ArrowRight
} from 'lucide-react';
import { financeAPI } from '@/lib/api/finance';

interface Envelope {
  id: string;
  name: string;
  emoji: string;
  current: number;
  total: number;
  percentage: number;
  color: string;
  status: 'good' | 'warning' | 'danger';
  spent: number;
  remaining: number;
  history: Array<{
    date: string;
    amount: number;
    description: string;
  }>;
}

export default function EnvelopesPage() {
  const [selectedEnvelope, setSelectedEnvelope] = useState<string | null>(null);
  const [showAddEnvelope, setShowAddEnvelope] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Fetch envelopes data from API
  const {
    data: envelopesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['budget', 'envelopes'],
    queryFn: () => financeAPI.budget.getEnvelopes(),
  });

  // Helper function to format relative time
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Zojuist';
    if (diffInHours < 24) return `${diffInHours}u geleden`;
    if (diffInHours < 48) return 'Gisteren';
    return `${Math.floor(diffInHours / 24)} dagen geleden`;
  }

  // Helper function to get envelope color
  const getEnvelopeColor = (category: string) => {
    const colorMap: Record<string, string> = {
      housing: 'from-indigo-400 to-indigo-600',
      utilities: 'from-yellow-400 to-yellow-600',
      groceries: 'from-emerald-400 to-emerald-600',
      transportation: 'from-blue-400 to-blue-600',
      healthcare: 'from-red-400 to-red-600',
      insurance: 'from-teal-400 to-teal-600',
      entertainment: 'from-purple-400 to-purple-600',
      dining: 'from-orange-400 to-orange-600',
      shopping: 'from-pink-400 to-pink-600',
      education: 'from-cyan-400 to-cyan-600',
      savings: 'from-green-400 to-green-600',
      debt_payment: 'from-rose-400 to-rose-600',
      investments: 'from-amber-400 to-amber-600',
      gifts: 'from-fuchsia-400 to-fuchsia-600',
      other: 'from-slate-400 to-slate-600',
    };
    return colorMap[category] || 'from-gray-400 to-gray-600';
  };

  // Transform API data to component format
  const envelopes: Envelope[] = envelopesData?.envelopes.map(env => ({
    id: env.category, // Use category as ID since backend doesn't return separate ID
    name: env.name,
    emoji: env.emoji,
    current: env.remaining,
    total: env.planned,
    percentage: env.percentage,
    color: getEnvelopeColor(env.category),
    status: env.status,
    spent: env.spent,
    remaining: env.remaining,
    history: env.recentTransactions.map(tx => ({
      date: formatRelativeTime(new Date(tx.date)),
      amount: -tx.amount,
      description: tx.description,
    })),
  })) || [];

  const totalBudget = envelopesData?.totalBudget || 0;
  const totalSpent = envelopesData?.totalSpent || 0;
  const totalRemaining = envelopesData?.totalRemaining || 0;
  const currentMonth = envelopesData?.month || '';

  const selected = envelopes.find(env => env.id === selectedEnvelope);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
              Er ging iets mis
            </h2>
            <p className="text-red-600 dark:text-red-400">
              {(error as Error)?.message || 'Kon envelopes niet laden'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/finance" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Budget Enveloppen</h1>
            </div>
            <button
              onClick={() => setShowAddEnvelope(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Nieuwe envelope</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Month Display */}
        {currentMonth && (
          <div className="mb-4">
            <p data-testid="budget-month" className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {currentMonth}
            </p>
          </div>
        )}

        {/* Budget Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totaal budget</p>
            </div>
            <p data-testid="total-budget" className="text-3xl font-bold text-gray-900 dark:text-white">€{totalBudget.toFixed(2)}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uitgegeven</p>
            </div>
            <p data-testid="total-spent" className="text-3xl font-bold text-gray-900 dark:text-white">€{totalSpent.toFixed(2)}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resterend</p>
            </div>
            <p data-testid="total-remaining" className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">€{totalRemaining.toFixed(2)}</p>
          </div>
        </div>

        {/* Main Content - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Envelope List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Jouw enveloppen</h2>
              <button
                onClick={() => setShowTransferModal(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Geld verplaatsen →
              </button>
            </div>

            <div className="space-y-4">
              {envelopes.map((envelope) => (
                <button
                  key={envelope.id}
                  data-testid={`envelope-${envelope.id}`}
                  onClick={() => setSelectedEnvelope(envelope.id)}
                  className={`w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all text-left ${
                    selectedEnvelope === envelope.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{envelope.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {envelope.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          €{envelope.spent} uitgegeven
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          data-testid={`envelope-${envelope.id}-status`}
                          className={`w-2 h-2 rounded-full ${getStatusColor(envelope.status)}`}
                        ></div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          €{envelope.remaining}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        van €{envelope.total}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-3 backdrop-blur-sm">
                      <div
                        data-testid={`envelope-${envelope.id}-progress`}
                        aria-valuenow={envelope.percentage}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className={`bg-gradient-to-r ${envelope.color} h-3 rounded-full transition-all duration-500 shadow-md ${
                          envelope.percentage >= 90 ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${Math.min(envelope.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {envelope.percentage}% gebruikt
                    </span>
                    {envelope.percentage >= 85 && (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        ⚠️ Bijna op!
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Envelope Detail Panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div data-testid="envelope-detail-panel" className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-gray-700/50 shadow-lg overflow-hidden sticky top-24">
                {/* Header */}
                <div className={`bg-gradient-to-br ${selected.color} p-6 text-white`}>
                  <div className="text-5xl mb-3">{selected.emoji}</div>
                  <h3 className="text-2xl font-bold mb-1">{selected.name}</h3>
                  <p className="text-white/80">€{selected.remaining} over van €{selected.total}</p>
                </div>

                {/* Actions */}
                <div className="p-6 space-y-3">
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <span className="font-medium text-gray-900 dark:text-white">Budget aanpassen</span>
                    <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <span className="font-medium text-gray-900 dark:text-white">Geld toevoegen</span>
                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* History */}
                <div className="p-6 pt-0">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Recente uitgaven</h4>
                  </div>

                  {selected.history.length > 0 ? (
                    <div className="space-y-3">
                      {selected.history.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start p-3 bg-white dark:bg-gray-700 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {item.date}
                            </p>
                          </div>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            €{Math.abs(item.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                      Nog geen uitgaven deze maand
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Selecteer een envelope om details te zien
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal - TODO: Create proper component */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Geld verplaatsen</h3>
              <button onClick={() => setShowTransferModal(false)}>
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Verplaats geld tussen enveloppen om je budget aan te passen.
            </p>
            {/* TODO: Add transfer form */}
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Functionaliteit wordt binnenkort toegevoegd
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
