/**
 * Finance API Client
 *
 * Type-safe API client for Finance module endpoints
 */

// API Base URL - update this to match your backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// API Response wrapper
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lifeos_access_token');
}

// Get refresh token from localStorage
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lifeos_refresh_token');
}

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Update tokens in localStorage
    if (data.tokens) {
      localStorage.setItem('lifeos_access_token', data.tokens.accessToken);
      localStorage.setItem('lifeos_refresh_token', data.tokens.refreshToken);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[API] Token refresh failed:', error);
    return false;
  }
}

// Clear auth data and redirect to login
function clearAuthAndRedirect(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lifeos_access_token');
    localStorage.removeItem('lifeos_refresh_token');
    localStorage.removeItem('lifeos_user');
    window.location.href = '/auth/login';
  }
}

// Generic fetch wrapper with automatic token refresh
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
  retryCount: number = 0
): Promise<T> {
  try {
    // Get JWT token
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    const data: APIResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      // If 401 Unauthorized, try to refresh token and retry once
      if (response.status === 401 && retryCount === 0) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          // Retry the original request with new token
          return fetchAPI<T>(endpoint, options, retryCount + 1);
        } else {
          // Refresh failed, clear auth and redirect to login
          clearAuthAndRedirect();
        }
      }

      throw new APIError(
        data.error || 'An error occurred',
        response.status,
        data
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// Type definitions matching backend DTOs

export enum ExpenseCategory {
  GROCERIES = 'groceries',
  DINING = 'dining',
  TRANSPORTATION = 'transportation',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  UTILITIES = 'utilities',
  HOUSING = 'housing',
  HEALTHCARE = 'healthcare',
  OTHER = 'other',
}

export enum PaymentMethod {
  CASH = 'cash',
  DEBIT_CARD = 'debit_card',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other',
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory | string;
  date: string;
  paymentMethod: PaymentMethod | string;
  merchantName?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
}

export interface TodayBudget {
  remainingToday: number;
  dailyLimit: number;
  percentUsed: number;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
  }>;
}

export interface AffordabilityCheck {
  canAfford: boolean;
  remainingDaily: number;
  envelopeImpact?: {
    envelopeName: string;
    currentAmount: number;
    newAmount: number;
    planned: number;
    newPercentage: number;
    exceedsEnvelope: boolean;
  };
}

export interface EnvelopesData {
  envelopes: Array<{
    category: string;
    name: string;
    emoji: string;
    planned: number;
    spent: number;
    remaining: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
    recentTransactions: Array<{
      description: string;
      amount: number;
      date: string;
      merchantName?: string;
    }>;
  }>;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  month: string;
}

// ===== Bank Integration Types =====

export enum BankProvider {
  PONTO = 'ponto',
  ISABEL = 'isabel',
}

export enum ConnectionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  IGNORED = 'ignored',
}

export interface BankConnection {
  id: string;
  provider: BankProvider;
  status: ConnectionStatus;
  lastSyncAt?: string;
  tokenExpiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  connectionId: string;
  iban?: string;
  accountHolderName?: string;
  accountName?: string;
  displayName: string;
  currency: string;
  currentBalance?: number;
  availableBalance?: number;
  institutionName?: string;
  syncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  amount: number;
  currency: string;
  description: string;
  counterPartyName?: string;
  counterPartyIban?: string;
  executionDate: string;
  valueDate?: string;
  reconciliationStatus: ReconciliationStatus;
  reconciledExpenseId?: string;
  suggestedCategory?: string;
  confidenceScore?: number;
  createdAt: string;
  isExpense: boolean;
  isIncome: boolean;
  absoluteAmount: number;
}

export interface AuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface SyncResult {
  accountsSynced: number;
  transactionsSynced: number;
  syncedAt: string;
}

export interface TransactionStatistics {
  total: number;
  pending: number;
  matched: number;
  ignored: number;
  totalExpenses: number;
  totalIncome: number;
}

export interface PotentialMatch {
  transaction: BankTransaction;
  matchScore: number;
  reason: string;
}

// ===== Categorization Types =====

export interface CategorizationRule {
  id: string;
  pattern: string;
  patternType: 'exact' | 'contains' | 'regex' | 'iban';
  category: string;
  confidence: number;
  priority: number;
  source?: 'manual' | 'feedback' | 'ml';
  createdAt: string;
  updatedAt: string;
}

// Finance API Client
export const financeAPI = {
  /**
   * Expense management
   */
  expenses: {
    create: (input: CreateExpenseInput) =>
      fetchAPI<Expense>('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    getAll: (params?: {
      category?: ExpenseCategory;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }) => {
      const queryString = params
        ? '?' + new URLSearchParams(params as any).toString()
        : '';
      return fetchAPI<{ expenses: Expense[]; total: number }>(
        `/finance/expenses${queryString}`
      );
    },

    getById: (id: string) =>
      fetchAPI<Expense>(`/finance/expenses/${id}`),

    update: (id: string, input: Partial<CreateExpenseInput>) =>
      fetchAPI<Expense>(`/finance/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      fetchAPI<void>(`/finance/expenses/${id}`, {
        method: 'DELETE',
      }),
  },

  /**
   * Budget management
   */
  budget: {
    getToday: () =>
      fetchAPI<TodayBudget>('/finance/budget/today'),

    checkAffordability: (amount: number, category: ExpenseCategory) =>
      fetchAPI<AffordabilityCheck>('/finance/budget/check-affordability', {
        method: 'POST',
        body: JSON.stringify({ amount, category }),
      }),

    getEnvelopes: () =>
      fetchAPI<EnvelopesData>('/finance/budget/envelopes'),

    create: (input: any) =>
      fetchAPI<any>('/finance/budget', {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    update: (id: string, input: any) =>
      fetchAPI<any>(`/finance/budget/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
  },

  /**
   * Bank integration - Connections
   */
  bank: {
    connections: {
      /**
       * Get authorization URL to start OAuth flow
       */
      getAuthUrl: (provider: BankProvider) =>
        fetchAPI<AuthUrlResponse>('/finance/bank/auth-url', {
          method: 'POST',
          body: JSON.stringify({ provider }),
        }),

      /**
       * Complete OAuth connection
       */
      completeConnection: (provider: BankProvider, authCode: string) =>
        fetchAPI<BankConnection>('/finance/bank/connect', {
          method: 'POST',
          body: JSON.stringify({ provider, authCode }),
        }),

      /**
       * Get all bank connections
       */
      getAll: () =>
        fetchAPI<BankConnection[]>('/finance/bank/connections'),

      /**
       * Get connection by ID
       */
      getById: (id: string) =>
        fetchAPI<BankConnection>(`/finance/bank/connections/${id}`),

      /**
       * Sync bank data (accounts and transactions)
       */
      sync: (id: string) =>
        fetchAPI<SyncResult>(`/finance/bank/connections/${id}/sync`, {
          method: 'POST',
        }),

      /**
       * Disconnect bank
       */
      disconnect: (id: string) =>
        fetchAPI<void>(`/finance/bank/connections/${id}`, {
          method: 'DELETE',
        }),
    },

    /**
     * Bank accounts
     */
    accounts: {
      /**
       * Get all bank accounts
       */
      getAll: (params?: { connectionId?: string; syncEnabled?: boolean }) => {
        const queryString = params
          ? '?' + new URLSearchParams(params as any).toString()
          : '';
        return fetchAPI<BankAccount[]>(`/finance/bank/accounts${queryString}`);
      },

      /**
       * Get account by ID
       */
      getById: (id: string) =>
        fetchAPI<BankAccount>(`/finance/bank/accounts/${id}`),

      /**
       * Toggle sync for account
       */
      toggleSync: (id: string, syncEnabled: boolean) =>
        fetchAPI<BankAccount>(`/finance/bank/accounts/${id}/sync`, {
          method: 'PATCH',
          body: JSON.stringify({ syncEnabled }),
        }),
    },

    /**
     * Bank transactions
     */
    transactions: {
      /**
       * Get all transactions
       */
      getAll: (params?: {
        bankAccountId?: string;
        startDate?: string;
        endDate?: string;
        reconciliationStatus?: ReconciliationStatus;
        limit?: number;
      }) => {
        const queryString = params
          ? '?' + new URLSearchParams(params as any).toString()
          : '';
        return fetchAPI<BankTransaction[]>(`/finance/bank/transactions${queryString}`);
      },

      /**
       * Get unreconciled transactions
       */
      getUnreconciled: () =>
        fetchAPI<BankTransaction[]>('/finance/bank/transactions/unreconciled'),

      /**
       * Get potential matches for an expense
       */
      getPotentialMatches: (amount: number, date: string, toleranceDays: number = 3) => {
        const queryString = new URLSearchParams({
          amount: amount.toString(),
          date,
          toleranceDays: toleranceDays.toString(),
        }).toString();
        return fetchAPI<PotentialMatch[]>(`/finance/bank/transactions/matches?${queryString}`);
      },

      /**
       * Get transaction statistics
       */
      getStatistics: (startDate: string, endDate: string) => {
        const queryString = new URLSearchParams({
          startDate,
          endDate,
        }).toString();
        return fetchAPI<TransactionStatistics>(`/finance/bank/transactions/statistics?${queryString}`);
      },

      /**
       * Get transaction by ID
       */
      getById: (id: string) =>
        fetchAPI<BankTransaction>(`/finance/bank/transactions/${id}`),

      /**
       * Reconcile transaction with expense
       */
      reconcile: (id: string, expenseId: string) =>
        fetchAPI<BankTransaction>(`/finance/bank/transactions/${id}/reconcile`, {
          method: 'POST',
          body: JSON.stringify({ expenseId }),
        }),

      /**
       * Ignore transaction
       */
      ignore: (id: string) =>
        fetchAPI<BankTransaction>(`/finance/bank/transactions/${id}/ignore`, {
          method: 'POST',
        }),

      /**
       * Unreconcile transaction
       */
      unreconcile: (id: string) =>
        fetchAPI<BankTransaction>(`/finance/bank/transactions/${id}/unreconcile`, {
          method: 'POST',
        }),
    },
  },

  /**
   * Categorization - AI-powered auto-categorization
   */
  categorization: {
    /**
     * Suggest category for a transaction
     */
    suggest: (transactionId: string) =>
      fetchAPI<{
        category: string;
        confidence: number;
        reason: string;
        source: 'rule' | 'ml' | 'history';
      }>('/finance/categorization/suggest', {
        method: 'POST',
        body: JSON.stringify({ transactionId }),
      }),

    /**
     * Provide feedback on categorization suggestion
     */
    provideFeedback: (params: {
      transactionId: string;
      suggestedCategory?: string;
      actualCategory: string;
      confidence?: number;
    }) =>
      fetchAPI<void>('/finance/categorization/feedback', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    /**
     * Create a new categorization rule
     */
    createRule: (params: {
      pattern: string;
      patternType: 'exact' | 'contains' | 'regex' | 'iban';
      category: string;
      confidence?: number;
      priority?: number;
    }) =>
      fetchAPI<CategorizationRule>('/finance/categorization/rules', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    /**
     * Get all categorization rules
     */
    getAllRules: () =>
      fetchAPI<CategorizationRule[]>('/finance/categorization/rules'),

    /**
     * Get categorization rule by ID
     */
    getRuleById: (id: string) =>
      fetchAPI<CategorizationRule>(`/finance/categorization/rules/${id}`),

    /**
     * Update categorization rule
     */
    updateRule: (id: string, params: {
      pattern?: string;
      patternType?: 'exact' | 'contains' | 'regex' | 'iban';
      category?: string;
      confidence?: number;
      priority?: number;
    }) =>
      fetchAPI<CategorizationRule>(`/finance/categorization/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(params),
      }),

    /**
     * Delete categorization rule
     */
    deleteRule: (id: string) =>
      fetchAPI<void>(`/finance/categorization/rules/${id}`, {
        method: 'DELETE',
      }),
  },
};
