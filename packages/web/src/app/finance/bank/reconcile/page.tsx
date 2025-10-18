'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  EyeOff,
  Search,
  TrendingDown,
  TrendingUp,
  Calendar,
  Building2,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Plus,
} from 'lucide-react';
import { financeAPI, BankTransaction, ReconciliationStatus, ExpenseCategory } from '@/lib/api/finance';

export default function ReconcilePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [feedbackTransaction, setFeedbackTransaction] = useState<BankTransaction | null>(null);
  const [correctedCategory, setCorrectedCategory] = useState<ExpenseCategory | ''>('');
  const [createRuleFromFeedback, setCreateRuleFromFeedback] = useState(false);

  // Fetch unreconciled transactions
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery({
    queryKey: ['bank', 'transactions', 'unreconciled'],
    queryFn: () => financeAPI.bank.transactions.getUnreconciled(),
  });

  // Fetch potential matches when transaction is selected
  const {
    data: potentialMatches,
    isLoading: isLoadingMatches,
  } = useQuery({
    queryKey: ['bank', 'transactions', 'matches', selectedTransaction?.id],
    queryFn: () =>
      financeAPI.bank.transactions.getPotentialMatches(
        selectedTransaction!.absoluteAmount,
        selectedTransaction!.executionDate,
        3 // tolerance days
      ),
    enabled: !!selectedTransaction,
  });

  // Reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: ({ transactionId, expenseId }: { transactionId: string; expenseId: string }) =>
      financeAPI.bank.transactions.reconcile(transactionId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank', 'transactions'] });
      setSelectedTransaction(null);
    },
  });

  // Ignore mutation
  const ignoreMutation = useMutation({
    mutationFn: (transactionId: string) => financeAPI.bank.transactions.ignore(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank', 'transactions'] });
    },
  });

  // Categorization feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: (params: {
      transactionId: string;
      suggestedCategory?: string;
      actualCategory: string;
      confidence?: number;
    }) => financeAPI.categorization.provideFeedback(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank', 'transactions'] });
      setFeedbackTransaction(null);
      setCorrectedCategory('');
      setCreateRuleFromFeedback(false);
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (params: {
      pattern: string;
      patternType: 'exact' | 'contains' | 'regex' | 'iban';
      category: string;
      confidence?: number;
      priority?: number;
    }) => financeAPI.categorization.createRule(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank', 'transactions'] });
    },
  });

  const handleIgnore = (transaction: BankTransaction) => {
    if (confirm('Are you sure you want to ignore this transaction?')) {
      ignoreMutation.mutate(transaction.id);
    }
  };

  const handleAcceptSuggestion = (transaction: BankTransaction) => {
    if (!transaction.suggestedCategory) return;

    feedbackMutation.mutate({
      transactionId: transaction.id,
      suggestedCategory: transaction.suggestedCategory,
      actualCategory: transaction.suggestedCategory,
      confidence: transaction.confidenceScore,
    });
  };

  const handleRejectSuggestion = (transaction: BankTransaction) => {
    setFeedbackTransaction(transaction);
    setCorrectedCategory('');
    setCreateRuleFromFeedback(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackTransaction || !correctedCategory) return;

    // Submit feedback
    await feedbackMutation.mutateAsync({
      transactionId: feedbackTransaction.id,
      suggestedCategory: feedbackTransaction.suggestedCategory,
      actualCategory: correctedCategory,
      confidence: feedbackTransaction.confidenceScore,
    });

    // Optionally create rule
    if (createRuleFromFeedback && feedbackTransaction.counterPartyName) {
      await createRuleMutation.mutateAsync({
        pattern: feedbackTransaction.counterPartyName,
        patternType: 'contains',
        category: correctedCategory,
        confidence: 90,
        priority: 1,
      });
    }
  };

  const handleReconcile = () => {
    if (!selectedTransaction || !selectedExpenseId) return;

    reconcileMutation.mutate({
      transactionId: selectedTransaction.id,
      expenseId: selectedExpenseId,
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
  };

  const filteredTransactions =
    transactions?.filter((tx) =>
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.counterPartyName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `€${Math.abs(amount).toFixed(2)}`;
  };

  const expenseCount = filteredTransactions.filter((tx) => tx.isExpense).length;
  const incomeCount = filteredTransactions.filter((tx) => tx.isIncome).length;
  const totalExpenses = filteredTransactions
    .filter((tx) => tx.isExpense)
    .reduce((sum, tx) => sum + tx.absoluteAmount, 0);
  const totalIncome = filteredTransactions
    .filter((tx) => tx.isIncome)
    .reduce((sum, tx) => sum + tx.absoluteAmount, 0);

  // Loading state
  if (isLoadingTransactions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (transactionsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 dark:text-red-400">
              {(transactionsError as Error)?.message || 'Could not load transactions'}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reconcile Transactions</h1>
            </div>
            <Link
              href="/finance/bank/settings"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Banks</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{filteredTransactions.length}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expenses</p>
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{expenseCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">€{totalExpenses.toFixed(2)}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Income</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{incomeCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">€{totalIncome.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5" />
              <p className="text-sm font-medium text-white/90">AI Suggestions</p>
            </div>
            <p className="text-3xl font-bold">Coming Soon</p>
            <p className="text-sm text-white/80 mt-1">Auto-match expenses</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All caught up!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You have no unreconciled transactions. Great job keeping your finances in sync!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.isExpense
                            ? 'bg-red-100 dark:bg-red-900/20'
                            : 'bg-emerald-100 dark:bg-emerald-900/20'
                        }`}
                      >
                        {transaction.isExpense ? (
                          <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {transaction.description}
                        </p>
                        {transaction.counterPartyName && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {transaction.counterPartyName}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(transaction.executionDate)}</span>
                          </div>
                          {transaction.suggestedCategory && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium">
                                <Sparkles className="w-3 h-3" />
                                <span>{transaction.suggestedCategory}</span>
                              </div>
                              {transaction.confidenceScore !== undefined && (
                                <span
                                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                    transaction.confidenceScore >= 90
                                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                      : transaction.confidenceScore >= 70
                                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                      : transaction.confidenceScore >= 50
                                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                                      : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                  }`}
                                >
                                  {transaction.confidenceScore}% confident
                                </span>
                              )}
                              {/* Feedback buttons */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptSuggestion(transaction);
                                  }}
                                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded text-emerald-600 dark:text-emerald-400 transition-colors"
                                  title="Accept suggestion"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectSuggestion(transaction);
                                  }}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-600 dark:text-red-400 transition-colors"
                                  title="Correct suggestion"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        transaction.isExpense
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {transaction.isExpense ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.currency}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      Match
                    </button>
                    <button
                      onClick={() => handleIgnore(transaction)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Ignore transaction"
                    >
                      <EyeOff className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Match Transaction</h3>
              <button
                onClick={() => {
                  setSelectedTransaction(null);
                  setSelectedExpenseId(null);
                }}
              >
                <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" />
              </button>
            </div>

            {/* Transaction Info */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-6 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedTransaction.isExpense
                      ? 'bg-red-100 dark:bg-red-900/40'
                      : 'bg-emerald-100 dark:bg-emerald-900/40'
                  }`}
                >
                  {selectedTransaction.isExpense ? (
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedTransaction.description}
                  </p>
                  {selectedTransaction.counterPartyName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTransaction.counterPartyName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p
                  className={`text-2xl font-bold ${
                    selectedTransaction.isExpense
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {selectedTransaction.isExpense ? '-' : '+'}
                  {formatCurrency(selectedTransaction.amount)}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(selectedTransaction.executionDate)}</span>
                </div>
              </div>
            </div>

            {/* Potential Matches */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Potential Matches
              </h4>

              {isLoadingMatches ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : !potentialMatches || potentialMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="mb-2">No matching expenses found</p>
                  <p className="text-sm">
                    Try creating a new expense for this transaction or adjust the date tolerance.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {potentialMatches.map((match) => (
                    <button
                      key={match.transaction.id}
                      onClick={() => setSelectedExpenseId(match.transaction.reconciledExpenseId || match.transaction.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedExpenseId === (match.transaction.reconciledExpenseId || match.transaction.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {match.transaction.description}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getMatchScoreColor(
                                match.matchScore
                              )}`}
                            >
                              {match.matchScore}% match
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{match.reason}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(match.transaction.executionDate)}</span>
                            </div>
                            <span>•</span>
                            <span>{match.transaction.currency}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(match.transaction.amount)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedTransaction(null);
                  setSelectedExpenseId(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReconcile}
                disabled={!selectedExpenseId || reconcileMutation.isPending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {reconcileMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Matching...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Reconcile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Correct Category</h3>
              <button
                onClick={() => {
                  setFeedbackTransaction(null);
                  setCorrectedCategory('');
                  setCreateRuleFromFeedback(false);
                }}
              >
                <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" />
              </button>
            </div>

            {/* Transaction Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                {feedbackTransaction.description}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feedbackTransaction.counterPartyName}
              </p>
            </div>

            {/* Suggested vs Correct */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">AI Suggested:</span>
                <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium">
                  {feedbackTransaction.suggestedCategory}
                </span>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Correct Category:
              </label>
              <select
                value={correctedCategory}
                onChange={(e) => setCorrectedCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Category --</option>
                {Object.values(ExpenseCategory).map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Rule Option */}
            {feedbackTransaction.counterPartyName && (
              <div className="mb-6">
                <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={createRuleFromFeedback}
                    onChange={(e) => setCreateRuleFromFeedback(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        Create Rule
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Always categorize transactions from "{feedbackTransaction.counterPartyName}" as the selected
                      category
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFeedbackTransaction(null);
                  setCorrectedCategory('');
                  setCreateRuleFromFeedback(false);
                }}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={!correctedCategory || feedbackMutation.isPending || createRuleMutation.isPending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {feedbackMutation.isPending || createRuleMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
