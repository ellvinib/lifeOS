'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { financeAPI, BankProvider } from '@/lib/api/finance';

type ConnectionStep = 'select' | 'connecting' | 'callback' | 'success' | 'error';

export default function ConnectBankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ConnectionStep>('select');
  const [selectedProvider, setSelectedProvider] = useState<BankProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback on mount
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStep('error');
      setError(`OAuth error: ${errorParam}`);
      return;
    }

    if (code && state) {
      // OAuth callback received
      setStep('callback');
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  // Get authorization URL mutation
  const getAuthUrlMutation = useMutation({
    mutationFn: (provider: BankProvider) => financeAPI.bank.connections.getAuthUrl(provider),
    onSuccess: (data) => {
      // Store provider and state token in sessionStorage for callback
      if (selectedProvider) {
        sessionStorage.setItem('bank_provider', selectedProvider);
      }
      sessionStorage.setItem('oauth_state', data.state);

      // Redirect to bank OAuth page
      window.location.href = data.authUrl;
    },
    onError: (err: any) => {
      setStep('error');
      setError(err.message || 'Failed to start connection');
    },
  });

  // Complete connection mutation
  const completeConnectionMutation = useMutation({
    mutationFn: async ({ provider, authCode }: { provider: BankProvider; authCode: string }) => {
      return financeAPI.bank.connections.completeConnection(provider, authCode);
    },
    onSuccess: () => {
      setStep('success');
      // Invalidate queries to refresh bank data
      queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });

      // Clean up session storage
      sessionStorage.removeItem('bank_provider');
      sessionStorage.removeItem('oauth_state');
    },
    onError: (err: any) => {
      setStep('error');
      setError(err.message || 'Failed to complete bank connection');
    },
  });

  // Handle OAuth callback
  const handleOAuthCallback = async (code: string, state: string) => {
    const storedProvider = sessionStorage.getItem('bank_provider') as BankProvider;
    const storedState = sessionStorage.getItem('oauth_state');

    if (!storedProvider) {
      setStep('error');
      setError('Missing provider information. Please try connecting again.');
      return;
    }

    if (storedState !== state) {
      setStep('error');
      setError('Invalid state parameter. Possible CSRF attack. Please try again.');
      return;
    }

    completeConnectionMutation.mutate({ provider: storedProvider, authCode: code });
  };

  const handleConnect = () => {
    if (!selectedProvider) return;

    setStep('connecting');
    getAuthUrlMutation.mutate(selectedProvider);
  };

  const providers = [
    {
      id: BankProvider.PONTO,
      name: 'Ponto',
      description: 'Connect to most Belgian and European banks',
      icon: '🏦',
      features: [
        'Multi-bank support',
        'Real-time sync',
        'Secure OAuth2 flow',
        'Transaction history',
      ],
      popular: true,
    },
    {
      id: BankProvider.ISABEL,
      name: 'Isabel Connect',
      description: 'Connect to Isabel-supported banks',
      icon: '🔒',
      features: [
        'Isabel Group banks',
        'Secure connection',
        'Business accounts',
        'Corporate banking',
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/finance/bank/settings"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Connect Bank Account</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Connecting State */}
        {step === 'connecting' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Redirecting to Bank...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we redirect you to your bank's secure login page.
            </p>
          </div>
        )}

        {/* Callback Processing State */}
        {step === 'callback' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Completing Connection...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We're finalizing your bank connection. This may take a few seconds.
            </p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connection Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your bank account is now connected. We're starting to sync your transactions.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/finance/bank/settings"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                View Bank Settings
              </Link>
              <Link
                href="/finance"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-red-200/50 dark:border-red-800/50 shadow-lg text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connection Failed
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-8">
              {error || 'An error occurred while connecting your bank account.'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setStep('select');
                  setError(null);
                  setSelectedProvider(null);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                Try Again
              </button>
              <Link
                href="/finance"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}

        {/* Select Provider State */}
        {step === 'select' && (
          <>
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Your Bank Account
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Automatically sync your transactions and reconcile expenses. We use secure OAuth2 authentication
            - we never see or store your banking credentials.
          </p>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bank-Level Security</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              OAuth2 authentication with encrypted token storage
            </p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Real-Time Sync</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic transaction updates every few hours
            </p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Easy Setup</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect in under 3 minutes with just a few clicks
            </p>
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Choose Your Banking Provider
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border-2 transition-all shadow-lg hover:shadow-xl text-left ${
                  selectedProvider === provider.id
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-white/50 dark:border-gray-700/50'
                }`}
              >
                {provider.popular && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-full">
                    Popular
                  </div>
                )}

                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl">{provider.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {provider.name}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {provider.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {provider.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {selectedProvider === provider.id && (
                  <div className="absolute inset-0 bg-blue-500/5 rounded-2xl pointer-events-none" />
                )}
              </button>
            ))}
          </div>

          {/* Connect Button */}
          <div className="flex justify-center">
            <button
              onClick={handleConnect}
              disabled={!selectedProvider || step !== 'select'}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continue to Bank Login</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">What happens next?</h4>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <li>1. You'll be redirected to your bank's secure login page</li>
              <li>2. Log in with your banking credentials (we never see these)</li>
              <li>3. Authorize LifeOS to access your transaction data</li>
              <li>4. You'll be redirected back here and we'll start syncing</li>
            </ol>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
