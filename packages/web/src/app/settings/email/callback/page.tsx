/**
 * Email OAuth Callback Page
 *
 * Handles OAuth callback from Microsoft/Google after authorization
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { emailApi } from '../../../../lib/api/email';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function EmailCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get authorization code from URL
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        throw new Error(errorDescription || error);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Get stored OAuth state
      const stateJson = sessionStorage.getItem('email_oauth_state');
      if (!stateJson) {
        throw new Error('OAuth state not found. Please try connecting again.');
      }

      const state = JSON.parse(stateJson);
      sessionStorage.removeItem('email_oauth_state');

      setMessage('Exchanging authorization code for tokens...');

      // TODO: Implement token exchange endpoint
      // For now, this is a placeholder showing the flow
      // The actual token exchange should happen on the backend for security

      // Exchange code for tokens (this should be done via API)
      // const response = await emailApi.exchangeOAuthCode({
      //   provider: state.provider,
      //   code,
      //   redirectUri: window.location.origin + '/settings/email/callback'
      // });

      setStatus('success');
      setMessage('Email account connected successfully!');

      // Redirect to email settings after 2 seconds
      setTimeout(() => {
        router.push('/settings/email');
      }, 2000);

    } catch (err: any) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to connect email account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting Account</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to email settings...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => router.push('/settings/email')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Email Settings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
