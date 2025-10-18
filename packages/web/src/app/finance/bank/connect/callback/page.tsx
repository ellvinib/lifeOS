'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Building2 } from 'lucide-react';
import { financeAPI, BankProvider } from '@/lib/api/finance';

type ConnectionState = 'connecting' | 'success' | 'error';

export default function BankConnectCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConnectionState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const completeConnectionMutation = useMutation({
    mutationFn: ({ provider, authCode }: { provider: BankProvider; authCode: string }) =>
      financeAPI.bank.connections.completeConnection(provider, authCode),
    onSuccess: () => {
      setState('success');
      // Redirect to settings page after 2 seconds
      setTimeout(() => {
        router.push('/finance/bank/settings');
      }, 2000);
    },
    onError: (error) => {
      setState('error');
      setErrorMessage((error as Error).message || 'Failed to complete connection');
    },
  });

  useEffect(() => {
    // Extract OAuth response parameters
    const code = searchParams.get('code');
    const oauthState = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for OAuth errors
    if (error) {
      setState('error');
      setErrorMessage(errorDescription || error || 'OAuth authorization failed');
      return;
    }

    // Validate required parameters
    if (!code || !oauthState) {
      setState('error');
      setErrorMessage('Missing authorization code or state parameter');
      return;
    }

    // Validate CSRF state token
    const storedState = sessionStorage.getItem('oauth_state');
    if (storedState !== oauthState) {
      setState('error');
      setErrorMessage('Invalid state token - possible CSRF attack');
      return;
    }

    // Get provider from URL or session
    // In a real app, you'd store this in the state parameter
    const provider = (searchParams.get('provider') as BankProvider) || BankProvider.PONTO;

    // Clear stored state
    sessionStorage.removeItem('oauth_state');

    // Complete the connection
    completeConnectionMutation.mutate({ provider, authCode: code });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-2xl max-w-md w-full text-center">
        {state === 'connecting' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 relative">
              <Building2 className="w-10 h-10 text-white" />
              <div className="absolute inset-0 border-4 border-blue-300 dark:border-blue-700 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Connecting Your Bank
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we complete the connection...
            </p>
            <div className="mt-8 flex justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Connection Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your bank account has been connected successfully. We'll start syncing your transactions now.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Redirecting you to settings...
              </p>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-6">
              <XCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Connection Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {errorMessage}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/finance/bank/connect')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/finance/bank/settings')}
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Back to Settings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
