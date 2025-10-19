/**
 * Email Integration API Client
 *
 * Provides methods to interact with the email integration API
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface EmailAccount {
  id: string;
  userId: string;
  provider: 'outlook' | 'gmail' | 'smtp';
  email: string;
  emailName?: string;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutlookCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface SmtpCredentials {
  username: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost?: string;
  smtpPort?: number;
}

export interface ConnectAccountRequest {
  userId: string;
  provider: 'outlook' | 'gmail' | 'smtp';
  email: string;
  emailName?: string;
  credentials: OutlookCredentials | GmailCredentials | SmtpCredentials;
}

export interface ListAccountsResponse {
  accounts: EmailAccount[];
  count: number;
}

/**
 * Email API Client
 */
export const emailApi = {
  /**
   * List all connected email accounts
   */
  async listAccounts(filters?: {
    provider?: 'outlook' | 'gmail' | 'smtp';
    isActive?: boolean;
  }): Promise<ListAccountsResponse> {
    const params = new URLSearchParams();
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

    const response = await axios.get(`${API_BASE_URL}/api/email/accounts?${params}`);
    return response.data;
  },

  /**
   * Connect a new email account
   */
  async connectAccount(data: ConnectAccountRequest): Promise<EmailAccount> {
    const response = await axios.post(`${API_BASE_URL}/api/email/accounts/connect`, data);
    return response.data;
  },

  /**
   * Disconnect an email account
   */
  async disconnectAccount(accountId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/email/accounts/${accountId}`);
  },

  /**
   * Initiate OAuth flow for Outlook
   */
  getOutlookAuthUrl(redirectUri: string): string {
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
    const scopes = 'Mail.Read Mail.ReadWrite offline_access';

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_mode=query`;
  },

  /**
   * Initiate OAuth flow for Gmail
   */
  getGmailAuthUrl(redirectUri: string): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const scopes = 'https://www.googleapis.com/auth/gmail.readonly';

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent`;
  },
};
