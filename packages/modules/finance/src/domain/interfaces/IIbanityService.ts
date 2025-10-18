/**
 * IIbanityService
 *
 * Interface for Ibanity API adapter.
 * Abstracts the Ibanity SDK behind a clean interface.
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { BankProvider } from '../value-objects/BankEnums';

/**
 * OAuth token response
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Account data from Ibanity
 */
export interface IbanityAccount {
  id: string;
  iban?: string;
  holderName?: string;
  description?: string;
  currency: string;
  currentBalance: number;
  availableBalance?: number;
  institution: string;
}

/**
 * Transaction data from Ibanity
 */
export interface IbanityTransaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  counterpartyName?: string;
  counterpartyReference?: string;
  executionDate: Date;
  valueDate?: Date;
  remittanceInformation?: string;
}

/**
 * Ibanity API service interface
 */
export interface IIbanityService {
  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(provider: BankProvider, state: string): string;

  /**
   * Exchange authorization code for access tokens
   */
  exchangeCodeForTokens(
    code: string,
    provider: BankProvider
  ): Promise<Result<TokenResponse, BaseError>>;

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(
    refreshToken: string,
    provider: BankProvider
  ): Promise<Result<TokenResponse, BaseError>>;

  /**
   * Get all accounts for the authenticated user
   */
  getAccounts(
    accessToken: string,
    provider: BankProvider
  ): Promise<Result<IbanityAccount[], BaseError>>;

  /**
   * Get transactions for a specific account
   */
  getTransactions(
    accessToken: string,
    accountId: string,
    fromDate: Date,
    toDate: Date,
    provider: BankProvider
  ): Promise<Result<IbanityTransaction[], BaseError>>;

  /**
   * Revoke access (disconnect)
   */
  revokeAccess(
    accessToken: string,
    provider: BankProvider
  ): Promise<Result<void, BaseError>>;
}
