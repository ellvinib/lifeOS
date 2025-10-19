/**
 * Email Account Card Component
 *
 * Displays a connected email account with disconnect option
 */

'use client';

import { EmailAccount } from '../../lib/api/email';
import { Mail, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface EmailAccountCardProps {
  account: EmailAccount;
  onDisconnect: (accountId: string) => void;
}

export function EmailAccountCard({ account, onDisconnect }: EmailAccountCardProps) {
  const providerColors = {
    outlook: 'bg-blue-100 text-blue-700',
    gmail: 'bg-red-100 text-red-700',
    smtp: 'bg-gray-100 text-gray-700',
  };

  const providerLabels = {
    outlook: 'Outlook',
    gmail: 'Gmail',
    smtp: 'SMTP/IMAP',
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Mail className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{account.email}</h3>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  providerColors[account.provider]
                }`}
              >
                {providerLabels[account.provider]}
              </span>
            </div>
            {account.emailName && (
              <p className="text-sm text-gray-500 mt-0.5">{account.emailName}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span className={`${account.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                {account.isActive ? '● Active' : '○ Inactive'}
              </span>
              {account.lastSyncedAt && (
                <span>
                  Last synced: {format(new Date(account.lastSyncedAt), 'MMM d, yyyy HH:mm')}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDisconnect(account.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect account"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
