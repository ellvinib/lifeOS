import { EmailProvider } from '../value-objects/EmailProvider';
import { EmailAddress } from '../value-objects/EmailAddress';

/**
 * EmailAccount Entity
 *
 * Represents a connected email account (Gmail, Outlook, or SMTP).
 * Contains provider-specific connection details and state.
 *
 * Rich domain model with business logic for account management.
 */
export class EmailAccount {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _provider: EmailProvider,
    private readonly _emailAddress: EmailAddress,
    private _isActive: boolean,
    private _lastSyncedAt: Date | null,
    private _providerData: Record<string, any>,
    private readonly _encryptedCredentials: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  /**
   * Create new email account
   */
  static create(params: {
    id: string;
    userId: string;
    provider: EmailProvider;
    emailAddress: EmailAddress;
    encryptedCredentials: string;
    providerData?: Record<string, any>;
  }): EmailAccount {
    const now = new Date();

    return new EmailAccount(
      params.id,
      params.userId,
      params.provider,
      params.emailAddress,
      false, // Initially inactive until connection is verified
      null,  // Never synced yet
      params.providerData || {},
      params.encryptedCredentials,
      now,
      now
    );
  }

  /**
   * Reconstruct from database
   */
  static fromPersistence(data: {
    id: string;
    userId: string;
    provider: EmailProvider;
    email: string;
    emailName?: string | null;
    isActive: boolean;
    lastSyncedAt: Date | null;
    providerData: Record<string, any>;
    encryptedCredentials: string;
    createdAt: Date;
    updatedAt: Date;
  }): EmailAccount {
    const emailAddressResult = EmailAddress.create(data.email, data.emailName);

    if (emailAddressResult.isFail()) {
      throw new Error(
        `Invalid email address in database: ${emailAddressResult.error.message}`
      );
    }

    return new EmailAccount(
      data.id,
      data.userId,
      data.provider,
      emailAddressResult.value,
      data.isActive,
      data.lastSyncedAt,
      data.providerData,
      data.encryptedCredentials,
      data.createdAt,
      data.updatedAt
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get provider(): EmailProvider {
    return this._provider;
  }

  get emailAddress(): EmailAddress {
    return this._emailAddress;
  }

  get email(): string {
    return this._emailAddress.address;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastSyncedAt(): Date | null {
    return this._lastSyncedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get encryptedCredentials(): string {
    return this._encryptedCredentials;
  }

  /**
   * Get provider-specific data
   *
   * Gmail: { historyId, watchExpiration }
   * Outlook: { subscriptionId, subscriptionExpiration, webhookSecret }
   * SMTP: { imapHost, imapPort, smtpHost, smtpPort }
   */
  get providerData(): Record<string, any> {
    return { ...this._providerData }; // Return copy
  }

  /**
   * Get provider-specific data (method form)
   */
  getProviderData(): Record<string, any> {
    return this.providerData;
  }

  /**
   * Update provider-specific data
   */
  setProviderData(data: Record<string, any>): void {
    this._providerData = { ...this._providerData, ...data };
    this._updatedAt = new Date();
  }

  /**
   * Update provider-specific data (alias for setProviderData)
   */
  updateProviderData(data: Record<string, any>): void {
    this.setProviderData(data);
  }

  /**
   * Mark account as active (connection verified)
   */
  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /**
   * Mark account as inactive (connection lost or user disabled)
   */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Update last synced timestamp
   */
  updateLastSynced(): void {
    this._lastSyncedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Update last synced timestamp with specific date (alias for updateLastSynced)
   */
  updateLastSyncedAt(date: Date): void {
    this._lastSyncedAt = date;
    this._updatedAt = new Date();
  }

  /**
   * Check if account needs sync
   *
   * @param intervalMinutes - Minimum minutes since last sync
   * @returns True if account should be synced
   */
  needsSync(intervalMinutes: number = 5): boolean {
    if (!this._isActive) {
      return false; // Don't sync inactive accounts
    }

    if (!this._lastSyncedAt) {
      return true; // Never synced
    }

    const minutesSinceSync =
      (Date.now() - this._lastSyncedAt.getTime()) / (1000 * 60);

    return minutesSinceSync >= intervalMinutes;
  }

  /**
   * Check if Outlook subscription needs renewal
   *
   * @returns True if subscription expires within 24 hours
   */
  outlookSubscriptionNeedsRenewal(): boolean {
    if (this._provider !== EmailProvider.OUTLOOK) {
      return false;
    }

    const { subscriptionExpiration } = this._providerData;
    if (!subscriptionExpiration) {
      return true; // No expiration set, needs setup
    }

    const expiration = new Date(subscriptionExpiration);
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return expiration < oneDayFromNow;
  }

  /**
   * Check if Gmail watch needs renewal
   *
   * @returns True if watch expires within 24 hours
   */
  gmailWatchNeedsRenewal(): boolean {
    if (this._provider !== EmailProvider.GMAIL) {
      return false;
    }

    const { watchExpiration } = this._providerData;
    if (!watchExpiration) {
      return true; // No expiration set, needs setup
    }

    const expiration = new Date(watchExpiration);
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return expiration < oneDayFromNow;
  }

  /**
   * Check if account belongs to a specific user
   */
  belongsTo(userId: string): boolean {
    return this._userId === userId;
  }

  /**
   * Get Outlook subscription ID (if Outlook provider)
   */
  getOutlookSubscriptionId(): string | null {
    if (this._provider !== EmailProvider.OUTLOOK) {
      return null;
    }
    return this._providerData.subscriptionId || null;
  }

  /**
   * Get Outlook webhook secret (if Outlook provider)
   */
  getOutlookWebhookSecret(): string | null {
    if (this._provider !== EmailProvider.OUTLOOK) {
      return null;
    }
    return this._providerData.webhookSecret || null;
  }

  /**
   * Convert to persistence format
   */
  toPersistence() {
    return {
      id: this._id,
      userId: this._userId,
      provider: this._provider,
      email: this._emailAddress.address,
      emailName: this._emailAddress.name,
      isActive: this._isActive,
      lastSyncedAt: this._lastSyncedAt,
      providerData: this._providerData,
      encryptedCredentials: this._encryptedCredentials,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
