/**
 * Email Settings Page
 *
 * Manage connected email accounts (Outlook, Gmail, SMTP)
 */

'use client';

import { useState, useEffect } from 'react';
import { emailApi, EmailAccount } from '../../../lib/api/email';
import { ConnectEmailForm } from '../../../components/email/ConnectEmailForm';
import { EmailAccountCard } from '../../../components/email/EmailAccountCard';
import { Plus, Mail, Loader2 } from 'lucide-react';

export default function EmailSettingsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual user ID from auth context
  const userId = 'user-123';

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await emailApi.listAccounts();
      setAccounts(response.accounts);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSuccess = async () => {
    setShowConnectForm(false);
    await loadAccounts();
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) {
      return;
    }

    try {
      await emailApi.disconnectAccount(accountId);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to disconnect email account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Mail className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Email Settings</h1>
          </div>
          <p className="text-gray-600">
            Connect and manage your email accounts for seamless integration with LifeOS
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Connected Accounts */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Connected Accounts</h2>
            {!showConnectForm && (
              <button
                onClick={() => setShowConnectForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No email accounts connected</h3>
              <p className="text-gray-500 mb-6">
                Connect your first email account to start syncing emails with LifeOS
              </p>
              {!showConnectForm && (
                <button
                  onClick={() => setShowConnectForm(true)}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Connect Email Account</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <EmailAccountCard
                  key={account.id}
                  account={account}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Connect Form Modal */}
        {showConnectForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <ConnectEmailForm
              userId={userId}
              onSuccess={handleConnectSuccess}
              onCancel={() => setShowConnectForm(false)}
            />
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Supported Email Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Microsoft Outlook</h4>
              <p className="text-sm text-blue-700">
                OAuth 2.0 authentication for secure access to Outlook.com and Office 365 accounts
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Gmail</h4>
              <p className="text-sm text-blue-700">
                OAuth 2.0 authentication for secure access to your Google email account
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">SMTP/IMAP</h4>
              <p className="text-sm text-blue-700">
                Connect any email provider using standard SMTP and IMAP protocols
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
