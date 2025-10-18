'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  EyeOff,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { financeAPI, BankTransaction, ReconciliationStatus, BankAccount } from '@/lib/api/finance';
import { exportTransactionsToCSV } from '@/lib/utils/export';

/**
 * Bank Transactions List Page
 *
 * Comprehensive view of all bank transactions with:
 * - Filtering by account, date range, status, type
 * - Search functionality
 * - Pagination
 * - Statistics
 * - Export capability
 */

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all'); // all, expense, income
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch bank accounts
  const { data: accounts } = useQuery({
    queryKey: ['bank', 'accounts'],
    queryFn: () => financeAPI.bank.accounts.getAll(),
  });

  // Fetch transactions
  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bank', 'transactions', selectedAccount, startDate, endDate, selectedStatus],
    queryFn: () =>
      financeAPI.bank.transactions.getAll({
        bankAccountId: selectedAccount !== 'all' ? selectedAccount : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        reconciliationStatus: selectedStatus !== 'all' ? (selectedStatus as ReconciliationStatus) : undefined,
      }),
  });

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.counterPartyName?.toLowerCase().includes(query) ||
          tx.counterPartyIban?.toLowerCase().includes(query)
      );
    }

    // Type filter (expense/income)
    if (selectedType === 'expense') {
      filtered = filtered.filter((tx) => tx.isExpense);
    } else if (selectedType === 'income') {
      filtered = filtered.filter((tx) => tx.isIncome);
    }

    return filtered;
  }, [transactions, searchTerm, selectedType]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    const total = filteredTransactions.length;
    const pending = filteredTransactions.filter((tx) => tx.reconciliationStatus === ReconciliationStatus.PENDING).length;
    const matched = filteredTransactions.filter((tx) => tx.reconciliationStatus === ReconciliationStatus.MATCHED).length;
    const ignored = filteredTransactions.filter((tx) => tx.reconciliationStatus === ReconciliationStatus.IGNORED).length;
    const totalExpenses = filteredTransactions
      .filter((tx) => tx.isExpense)
      .reduce((sum, tx) => sum + tx.absoluteAmount, 0);
    const totalIncome = filteredTransactions
      .filter((tx) => tx.isIncome)
      .reduce((sum, tx) => sum + tx.absoluteAmount, 0);

    return { total, pending, matched, ignored, totalExpenses, totalIncome };
  }, [filteredTransactions]);

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

  const getStatusBadge = (status: ReconciliationStatus) => {
    switch (status) {
      case ReconciliationStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case ReconciliationStatus.MATCHED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Matched
          </span>
        );
      case ReconciliationStatus.IGNORED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium">
            <EyeOff className="w-3 h-3" />
            Ignored
          </span>
        );
    }
  };

  // Loading state
  if (isLoading) {
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
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">Something went wrong</h2>
            <p className="text-red-600 dark:text-red-400">
              {(error as Error)?.message || 'Could not load transactions'}
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
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bank Transactions</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportTransactionsToCSV(filteredTransactions)}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <Link
                href="/finance/bank/settings"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Banks</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Matched</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.matched}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ignored</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.ignored}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">€{stats.totalExpenses.toFixed(2)}</p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Income</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">€{stats.totalIncome.toFixed(2)}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions by description, counterparty, or IBAN..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Account Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bank Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Accounts</option>
                  {accounts?.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value={ReconciliationStatus.PENDING}>Pending</option>
                  <option value={ReconciliationStatus.MATCHED}>Matched</option>
                  <option value={ReconciliationStatus.IGNORED}>Ignored</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="expense">Expenses Only</option>
                  <option value="income">Income Only</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedAccount !== 'all' ||
              selectedStatus !== 'all' ||
              selectedType !== 'all' ||
              startDate ||
              endDate) && (
              <button
                onClick={() => {
                  setSelectedAccount('all');
                  setSelectedStatus('all');
                  setSelectedType('all');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No transactions found</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedAccount !== 'all' || selectedStatus !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Connect your bank account to start syncing transactions'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Transaction Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
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
                          {getStatusBadge(transaction.reconciliationStatus)}
                          {transaction.suggestedCategory && (
                            <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium">
                              {transaction.suggestedCategory}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
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
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}{' '}
                  transactions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
