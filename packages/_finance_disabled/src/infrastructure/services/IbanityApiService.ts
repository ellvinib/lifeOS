/**
 * IbanityApiService
 *
 * Service adapter for Ibanity API (Ponto & Isabel Connect).
 * Wraps the Ibanity SDK and provides a clean interface for OAuth flows
 * and financial data retrieval.
 *
 * @see https://documentation.ibanity.com/
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError } from '@lifeOS/core/shared/errors';
import {
  IIbanityService,
  TokenResponse,
  IbanityAccount,
  IbanityTransaction,
} from '../../domain/interfaces/IIbanityService';
import { BankProvider } from '../../domain/value-objects/BankEnums';

/**
 * Configuration for Ibanity OAuth and API
 */
interface IbanityConfig {
  // Ponto configuration
  pontoClientId: string;
  pontoClientSecret: string;
  pontoRedirectUri: string;

  // Isabel Connect configuration
  isabelClientId: string;
  isabelClientSecret: string;
  isabelRedirectUri: string;

  // Ibanity API configuration
  apiEndpoint: string;
  tlsCertPath?: string; // Optional: for mutual TLS
  tlsKeyPath?: string;
}

/**
 * Ibanity API Service
 *
 * Implements OAuth2 flows and data fetching for both Ponto and Isabel Connect.
 * Uses Result pattern for consistent error handling.
 */
export class IbanityApiService implements IIbanityService {
  private readonly config: IbanityConfig;

  // OAuth endpoints
  private readonly PONTO_AUTH_URL = 'https://authorization.myponto.com/oauth2/authorize';
  private readonly PONTO_TOKEN_URL = 'https://api.ibanity.com/ponto-connect/oauth2/token';
  private readonly ISABEL_AUTH_URL = 'https://authorization.isaabelconnect.com/oauth2/authorize';
  private readonly ISABEL_TOKEN_URL = 'https://api.ibanity.com/isabel-connect/oauth2/token';

  // API base URLs
  private readonly PONTO_API_BASE = 'https://api.ibanity.com/ponto-connect';
  private readonly ISABEL_API_BASE = 'https://api.ibanity.com/isabel-connect';

  constructor(config: IbanityConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate configuration on initialization
   */
  private validateConfig(): void {
    if (!this.config.pontoClientId || !this.config.pontoClientSecret) {
      throw new Error('Ponto OAuth credentials are required');
    }
    if (!this.config.isabelClientId || !this.config.isabelClientSecret) {
      throw new Error('Isabel Connect OAuth credentials are required');
    }
    if (!this.config.apiEndpoint) {
      throw new Error('Ibanity API endpoint is required');
    }
  }

  /**
   * Get OAuth configuration for provider
   */
  private getProviderConfig(provider: BankProvider): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    apiBase: string;
  } {
    if (provider === BankProvider.PONTO) {
      return {
        clientId: this.config.pontoClientId,
        clientSecret: this.config.pontoClientSecret,
        redirectUri: this.config.pontoRedirectUri,
        authUrl: this.PONTO_AUTH_URL,
        tokenUrl: this.PONTO_TOKEN_URL,
        apiBase: this.PONTO_API_BASE,
      };
    } else {
      return {
        clientId: this.config.isabelClientId,
        clientSecret: this.config.isabelClientSecret,
        redirectUri: this.config.isabelRedirectUri,
        authUrl: this.ISABEL_AUTH_URL,
        tokenUrl: this.ISABEL_TOKEN_URL,
        apiBase: this.ISABEL_API_BASE,
      };
    }
  }

  /**
   * Get authorization URL for OAuth flow
   *
   * @param provider Bank provider (Ponto or Isabel)
   * @param state CSRF token for OAuth security
   * @returns Authorization URL to redirect user to
   */
  public getAuthorizationUrl(provider: BankProvider, state: string): string {
    const config = this.getProviderConfig(provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'ai offline_access', // account information + offline access
      state,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   *
   * @param code Authorization code from OAuth callback
   * @param provider Bank provider
   * @returns TokenResponse with access token, refresh token, and expiry
   */
  public async exchangeCodeForTokens(
    code: string,
    provider: BankProvider
  ): Promise<Result<TokenResponse, BaseError>> {
    try {
      const config = this.getProviderConfig(provider);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.fail(
          new ValidationError(`Token exchange failed: ${errorData.error || response.statusText}`)
        );
      }

      const data = await response.json();

      const tokenResponse: TokenResponse = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };

      return Result.ok(tokenResponse);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'TOKEN_EXCHANGE_FAILED',
          `Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken Current refresh token
   * @param provider Bank provider
   * @returns New TokenResponse
   */
  public async refreshAccessToken(
    refreshToken: string,
    provider: BankProvider
  ): Promise<Result<TokenResponse, BaseError>> {
    try {
      const config = this.getProviderConfig(provider);

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.fail(
          new ValidationError(`Token refresh failed: ${errorData.error || response.statusText}`)
        );
      }

      const data = await response.json();

      const tokenResponse: TokenResponse = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };

      return Result.ok(tokenResponse);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'TOKEN_REFRESH_FAILED',
          `Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }
  }

  /**
   * Get all accounts for the authenticated user
   *
   * @param accessToken OAuth access token
   * @param provider Bank provider
   * @returns List of bank accounts
   */
  public async getAccounts(
    accessToken: string,
    provider: BankProvider
  ): Promise<Result<IbanityAccount[], BaseError>> {
    try {
      const config = this.getProviderConfig(provider);
      const url = `${config.apiBase}/accounts`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.api+json',
        },
      });

      if (!response.ok) {
        return Result.fail(
          new BaseError(
            'ACCOUNTS_FETCH_FAILED',
            `Failed to fetch accounts: ${response.statusText}`,
            response.status
          )
        );
      }

      const data = await response.json();

      // Parse Ibanity JSON:API format
      const accounts: IbanityAccount[] = data.data.map((item: any) => ({
        id: item.id,
        iban: item.attributes.reference,
        holderName: item.attributes.holderName,
        description: item.attributes.description,
        currency: item.attributes.currency,
        currentBalance: parseFloat(item.attributes.currentBalance),
        availableBalance: item.attributes.availableBalance
          ? parseFloat(item.attributes.availableBalance)
          : undefined,
        institution: item.attributes.financialInstitutionName || 'Unknown',
      }));

      return Result.ok(accounts);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'ACCOUNTS_FETCH_ERROR',
          `Error fetching accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }
  }

  /**
   * Get transactions for a specific account
   *
   * @param accessToken OAuth access token
   * @param accountId Ibanity account ID
   * @param fromDate Start date for transactions
   * @param toDate End date for transactions
   * @param provider Bank provider
   * @returns List of transactions
   */
  public async getTransactions(
    accessToken: string,
    accountId: string,
    fromDate: Date,
    toDate: Date,
    provider: BankProvider
  ): Promise<Result<IbanityTransaction[], BaseError>> {
    try {
      const config = this.getProviderConfig(provider);

      // Build URL with pagination support
      const params = new URLSearchParams({
        'filter[valueDate][gte]': fromDate.toISOString().split('T')[0],
        'filter[valueDate][lte]': toDate.toISOString().split('T')[0],
        'page[limit]': '100', // Max per page
      });

      const url = `${config.apiBase}/accounts/${accountId}/transactions?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.api+json',
        },
      });

      if (!response.ok) {
        return Result.fail(
          new BaseError(
            'TRANSACTIONS_FETCH_FAILED',
            `Failed to fetch transactions: ${response.statusText}`,
            response.status
          )
        );
      }

      const data = await response.json();

      // Parse Ibanity JSON:API format
      const transactions: IbanityTransaction[] = data.data.map((item: any) => ({
        id: item.id,
        amount: parseFloat(item.attributes.amount),
        currency: item.attributes.currency,
        description: item.attributes.description || item.attributes.remittanceInformation || '',
        counterpartyName: item.attributes.counterpartName,
        counterpartyReference: item.attributes.counterpartReference,
        executionDate: new Date(item.attributes.executionDate),
        valueDate: item.attributes.valueDate ? new Date(item.attributes.valueDate) : undefined,
        remittanceInformation: item.attributes.remittanceInformation,
      }));

      // TODO: Handle pagination if there are more pages
      // Check data.links.next and fetch remaining pages

      return Result.ok(transactions);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'TRANSACTIONS_FETCH_ERROR',
          `Error fetching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }
  }

  /**
   * Revoke access (disconnect bank connection)
   *
   * @param accessToken OAuth access token
   * @param provider Bank provider
   * @returns Success or error
   */
  public async revokeAccess(
    accessToken: string,
    provider: BankProvider
  ): Promise<Result<void, BaseError>> {
    try {
      const config = this.getProviderConfig(provider);
      const url = `${config.tokenUrl}/revoke`;

      const body = new URLSearchParams({
        token: accessToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      // Revoke typically returns 200 OK or 204 No Content
      if (!response.ok && response.status !== 204) {
        return Result.fail(
          new BaseError(
            'REVOKE_ACCESS_FAILED',
            `Failed to revoke access: ${response.statusText}`,
            response.status
          )
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'REVOKE_ACCESS_ERROR',
          `Error revoking access: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }
  }
}

/**
 * Factory function to create IbanityApiService from environment variables
 */
export function createIbanityApiService(): IbanityApiService {
  const config: IbanityConfig = {
    // Ponto configuration
    pontoClientId: process.env.IBANITY_PONTO_CLIENT_ID || '',
    pontoClientSecret: process.env.IBANITY_PONTO_CLIENT_SECRET || '',
    pontoRedirectUri: process.env.IBANITY_PONTO_REDIRECT_URI || '',

    // Isabel Connect configuration
    isabelClientId: process.env.IBANITY_ISABEL_CLIENT_ID || '',
    isabelClientSecret: process.env.IBANITY_ISABEL_CLIENT_SECRET || '',
    isabelRedirectUri: process.env.IBANITY_ISABEL_REDIRECT_URI || '',

    // API configuration
    apiEndpoint: process.env.IBANITY_API_ENDPOINT || 'https://api.ibanity.com',
    tlsCertPath: process.env.IBANITY_TLS_CERT_PATH,
    tlsKeyPath: process.env.IBANITY_TLS_KEY_PATH,
  };

  return new IbanityApiService(config);
}
