/**
 * Connect Email Form Component
 *
 * Form for connecting email accounts (Outlook, Gmail, SMTP)
 */

'use client';

import { useState } from 'react';
import { emailApi, ConnectAccountRequest } from '../../lib/api/email';
import { Mail, Loader2 } from 'lucide-react';

type Provider = 'outlook' | 'gmail' | 'smtp';

interface ConnectEmailFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConnectEmailForm({ userId, onSuccess, onCancel }: ConnectEmailFormProps) {
  const [provider, setProvider] = useState<Provider>('outlook');
  const [email, setEmail] = useState('');
  const [emailName, setEmailName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SMTP-specific fields
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');

  // OAuth fields
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const handleOAuthConnect = (type: 'outlook' | 'gmail') => {
    const redirectUri = `${window.location.origin}/settings/email/callback`;
    const authUrl =
      type === 'outlook'
        ? emailApi.getOutlookAuthUrl(redirectUri)
        : emailApi.getGmailAuthUrl(redirectUri);

    // Store state for callback
    sessionStorage.setItem('email_oauth_state', JSON.stringify({ provider: type, userId }));

    // Redirect to OAuth page
    window.location.href = authUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let credentials;

      if (provider === 'smtp') {
        credentials = {
          username: smtpUsername,
          password: smtpPassword,
          imapHost,
          imapPort: parseInt(imapPort, 10),
          smtpHost: smtpHost || undefined,
          smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
        };
      } else {
        // OAuth providers
        credentials = {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        };
      }

      const request: ConnectAccountRequest = {
        userId,
        provider,
        email,
        emailName: emailName || undefined,
        credentials,
      };

      await emailApi.connectAccount(request);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to connect email account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect Email Account</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Provider
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'outlook', label: 'Outlook', color: 'border-blue-500' },
              { value: 'gmail', label: 'Gmail', color: 'border-red-500' },
              { value: 'smtp', label: 'SMTP/IMAP', color: 'border-gray-500' },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvider(p.value as Provider)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  provider === p.value
                    ? `${p.color} bg-blue-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Mail className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Email Address - Only for SMTP */}
        {provider === 'smtp' && (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-email@example.com"
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="emailName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name (Optional)
              </label>
              <input
                id="emailName"
                type="text"
                value={emailName}
                onChange={(e) => setEmailName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Name"
              />
            </div>
          </>
        )}

        {/* OAuth Providers */}
        {(provider === 'outlook' || provider === 'gmail') && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-sm text-blue-800 mb-4">
                Click the button below to securely connect your {provider === 'outlook' ? 'Microsoft' : 'Google'} account.
                You'll be redirected to sign in and authorize access to your emails.
              </p>
              <button
                type="button"
                onClick={() => handleOAuthConnect(provider)}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Connect with {provider === 'outlook' ? 'Microsoft' : 'Google'}
                </span>
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              No credentials are stored. We'll only save secure access tokens provided by {provider === 'outlook' ? 'Microsoft' : 'Google'}.
            </p>
          </div>
        )}

        {/* SMTP Provider */}
        {provider === 'smtp' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMAP Host *
                </label>
                <input
                  type="text"
                  required
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="imap.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMAP Port *
                </label>
                <input
                  type="number"
                  required
                  value={imapPort}
                  onChange={(e) => setImapPort(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="993"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host (Optional)
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port (Optional)
                </label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="465"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions - Only show for SMTP */}
        {provider === 'smtp' && (
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Connecting...' : 'Connect Account'}</span>
            </button>
          </div>
        )}

        {/* Cancel button for OAuth */}
        {(provider === 'outlook' || provider === 'gmail') && (
          <div className="flex items-center justify-center pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
