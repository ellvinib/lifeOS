/**
 * BankConnection Entity
 *
 * Represents an OAuth connection to a bank via Ibanity.
 * Stores encrypted access tokens and manages token lifecycle.
 */

import { BankProvider, ConnectionStatus } from '../value-objects/BankEnums';

export interface BankConnectionProps {
  id: string;
  userId: string;
  provider: BankProvider;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiresAt: Date;
  accountInformationConsentId?: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class BankConnection {
  private constructor(private props: BankConnectionProps) {
    this.validate();
  }

  /**
   * Create a new BankConnection instance
   */
  public static create(props: Omit<BankConnectionProps, 'id' | 'createdAt' | 'updatedAt'>): BankConnection {
    const now = new Date();
    return new BankConnection({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from database
   */
  public static fromPersistence(props: BankConnectionProps): BankConnection {
    return new BankConnection(props);
  }

  /**
   * Validate business rules
   */
  private validate(): void {
    if (!this.props.userId) {
      throw new Error('User ID is required');
    }
    if (!this.props.encryptedAccessToken || !this.props.encryptedRefreshToken) {
      throw new Error('Both access and refresh tokens are required');
    }
    if (this.props.tokenExpiresAt <= new Date()) {
      this.props.status = ConnectionStatus.EXPIRED;
    }
  }

  // ============================================================================
  // Business Logic Methods
  // ============================================================================

  /**
   * Check if the access token is expired
   */
  public isTokenExpired(): boolean {
    return new Date() >= this.props.tokenExpiresAt;
  }

  /**
   * Check if token needs refresh (5 minutes before expiry)
   */
  public needsRefresh(): boolean {
    const fiveMinutesInMs = 5 * 60 * 1000;
    const refreshTime = new Date(this.props.tokenExpiresAt.getTime() - fiveMinutesInMs);
    return new Date() >= refreshTime;
  }

  /**
   * Check if connection can sync
   */
  public canSync(): boolean {
    return this.props.status === ConnectionStatus.ACTIVE && !this.isTokenExpired();
  }

  /**
   * Update tokens after refresh
   */
  public updateTokens(
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    expiresAt: Date
  ): void {
    this.props.encryptedAccessToken = encryptedAccessToken;
    this.props.encryptedRefreshToken = encryptedRefreshToken;
    this.props.tokenExpiresAt = expiresAt;
    this.props.status = ConnectionStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark connection as synced
   */
  public markSynced(): void {
    this.props.lastSyncAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Revoke this connection
   */
  public revoke(): void {
    this.props.status = ConnectionStatus.REVOKED;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark as expired
   */
  public markExpired(): void {
    this.props.status = ConnectionStatus.EXPIRED;
    this.props.updatedAt = new Date();
  }

  // ============================================================================
  // Getters
  // ============================================================================

  public get id(): string {
    return this.props.id;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get provider(): BankProvider {
    return this.props.provider;
  }

  public get encryptedAccessToken(): string {
    return this.props.encryptedAccessToken;
  }

  public get encryptedRefreshToken(): string {
    return this.props.encryptedRefreshToken;
  }

  public get tokenExpiresAt(): Date {
    return this.props.tokenExpiresAt;
  }

  public get accountInformationConsentId(): string | undefined {
    return this.props.accountInformationConsentId;
  }

  public get status(): ConnectionStatus {
    return this.props.status;
  }

  public get lastSyncAt(): Date | undefined {
    return this.props.lastSyncAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Get time until token expiry in minutes
   */
  public getMinutesUntilExpiry(): number {
    const now = new Date();
    const diffMs = this.props.tokenExpiresAt.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Get time since last sync in hours (null if never synced)
   */
  public getHoursSinceLastSync(): number | null {
    if (!this.props.lastSyncAt) return null;
    const now = new Date();
    const diffMs = now.getTime() - this.props.lastSyncAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }
}
