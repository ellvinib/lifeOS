'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Building2,
  CreditCard,
  RefreshCw,
  Trash2,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { financeAPI, BankConnection, BankAccount, BankProvider, ConnectionStatus } from '@/lib/api/finance';

export default function BankSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);

  // Fetch bank connections
  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
  } = useQuery({
    queryKey: ['bank', 'connections'],
    queryFn: () => financeAPI.bank.connections.getAll(),
  });

  // Fetch bank accounts
  const {
    data: accounts,
    isLoading: isLoadingAccounts,
  } = useQuery({
    queryKey: ['bank', 'accounts'],
    queryFn: () => financeAPI.bank.accounts.getAll(),
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: (connectionId: string) => financeAPI.bank.connections.sync(connectionId),
    onMutate: (connectionId) => {
      setSyncingConnection(connectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank'] });
      setSyncingConnection(null);
    },
    onError: () => {
      setSyncingConnection(null);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => financeAPI.bank.connections.disconnect(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank'] });
    },
  });

  // Toggle sync mutation
  const toggleSyncMutation = useMutation({
    mutationFn: ({ accountId, syncEnabled }: { accountId: string; syncEnabled: boolean }) =>
      financeAPI.bank.accounts.toggleSync(accountId, syncEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank', 'accounts'] });
    },
  });

  const handleSync = (connectionId: string) => {
    syncMutation.mutate(connectionId);
  };

  const handleDisconnect = (connectionId: string) => {
    if (confirm('Are you sure you want to disconnect this bank? This action cannot be undone.')) {
      disconnectMutation.mutate(connectionId);
    }
  };

  const handleToggleAccountSync = (accountId: string, currentState: boolean) => {
    toggleSyncMutation.mutate({ accountId, syncEnabled: !currentState });
  };

  const getProviderName = (provider: BankProvider) => {
    return provider === BankProvider.PONTO ? 'Ponto' : 'Isabel Connect';
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.ACTIVE:
        return 'bg-emerald-500';
      case ConnectionStatus.EXPIRED:
        return 'bg-orange-500';
      case ConnectionStatus.REVOKED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.ACTIVE:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case ConnectionStatus.EXPIRED:
        return <Clock className="w-5 h-5 text-orange-500" />;
      case ConnectionStatus.REVOKED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConnectionAccounts = (connectionId: string) => {
    return accounts?.filter((acc) => acc.connectionId === connectionId) || [];
  };

  // Loading state
  if (isLoadingConnections || isLoadingAccounts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
            <div className="h-64 bg-white/60 dark:bg-gray-800/60 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 dark:text-red-400">
              {(connectionsError as Error)?.message || 'Could not load bank connections'}
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bank Connections</h1>
            </div>
            <Link
              href="/finance/bank/connect"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Bank</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Empty State */}
        {!connections || connections.length === 0 ? (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <div className="max-w-md mx-auto">
              <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No bank connections yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your bank account to automatically sync transactions and reconcile expenses.
              </p>
              <Link
                href="/finance/bank/connect"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Connect Your First Bank</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {connections.map((connection) => {
              const connectionAccounts = getConnectionAccounts(connection.id);
              const isSyncing = syncingConnection === connection.id;

              return (
                <div
                  key={connection.id}
                  className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg"
                >
                  {/* Connection Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {getProviderName(connection.provider)}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(connection.status)}
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                            {connection.status}
                          </span>
                        </div>
                        {connection.lastSyncAt && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(connection.id)}
                        disabled={isSyncing || connection.status !== ConnectionStatus.ACTIVE}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                      <button
                        onClick={() => handleDisconnect(connection.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Accounts */}
                  {connectionAccounts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Connected Accounts ({connectionAccounts.length})
                      </h4>
                      <div className="space-y-3">
                        {connectionAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {account.displayName}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {account.currentBalance !== undefined
                                    ? `€${account.currentBalance.toFixed(2)} • `
                                    : ''}
                                  {account.currency}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleAccountSync(account.id, account.syncEnabled)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                account.syncEnabled
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {account.syncEnabled ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Syncing</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  <span>Paused</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
