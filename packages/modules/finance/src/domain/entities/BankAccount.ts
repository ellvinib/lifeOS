/**
 * BankAccount Entity
 *
 * Represents a bank account retrieved from Ibanity.
 * Contains account details, balance, and sync settings.
 */

import { Money } from '../value-objects/Money';

export interface BankAccountProps {
  id: string;
  connectionId: string;
  externalId: string;
  iban?: string;
  accountHolderName?: string;
  accountName?: string;
  currency: string;
  currentBalance?: number;
  availableBalance?: number;
  institutionName?: string;
  syncEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class BankAccount {
  private constructor(private props: BankAccountProps) {
    this.validate();
  }

  /**
   * Create a new BankAccount instance
   */
  public static create(props: Omit<BankAccountProps, 'id' | 'createdAt' | 'updatedAt'>): BankAccount {
    const now = new Date();
    return new BankAccount({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from database
   */
  public static fromPersistence(props: BankAccountProps): BankAccount {
    return new BankAccount(props);
  }

  /**
   * Validate business rules
   */
  private validate(): void {
    if (!this.props.connectionId) {
      throw new Error('Connection ID is required');
    }
    if (!this.props.externalId) {
      throw new Error('External ID is required');
    }
    if (!this.props.currency) {
      throw new Error('Currency is required');
    }
  }

  // ============================================================================
  // Business Logic Methods
  // ============================================================================

  /**
   * Enable synchronization for this account
   */
  public enableSync(): void {
    this.props.syncEnabled = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Disable synchronization for this account
   */
  public disableSync(): void {
    this.props.syncEnabled = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Update balance from bank API
   */
  public updateBalance(currentBalance: number, availableBalance?: number): void {
    this.props.currentBalance = currentBalance;
    if (availableBalance !== undefined) {
      this.props.availableBalance = availableBalance;
    }
    this.props.updatedAt = new Date();
  }

  /**
   * Get current balance as Money value object
   */
  public getCurrentBalanceMoney(): Money | null {
    if (this.props.currentBalance === undefined) return null;
    return Money.fromDecimal(this.props.currentBalance, this.props.currency);
  }

  /**
   * Get available balance as Money value object
   */
  public getAvailableBalanceMoney(): Money | null {
    if (this.props.availableBalance === undefined) return null;
    return Money.fromDecimal(this.props.availableBalance, this.props.currency);
  }

  /**
   * Get display name (account name or IBAN)
   */
  public getDisplayName(): string {
    if (this.props.accountName) return this.props.accountName;
    if (this.props.iban) return this.maskIban(this.props.iban);
    return `Account ${this.props.externalId.slice(0, 8)}`;
  }

  /**
   * Mask IBAN for display (show only last 4 digits)
   */
  private maskIban(iban: string): string {
    if (iban.length <= 4) return iban;
    return `****${iban.slice(-4)}`;
  }

  /**
   * Check if account has sufficient balance for amount
   */
  public hasSufficientBalance(amount: number): boolean {
    const balance = this.props.availableBalance ?? this.props.currentBalance;
    return balance !== undefined && balance >= amount;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  public get id(): string {
    return this.props.id;
  }

  public get connectionId(): string {
    return this.props.connectionId;
  }

  public get externalId(): string {
    return this.props.externalId;
  }

  public get iban(): string | undefined {
    return this.props.iban;
  }

  public get accountHolderName(): string | undefined {
    return this.props.accountHolderName;
  }

  public get accountName(): string | undefined {
    return this.props.accountName;
  }

  public get currency(): string {
    return this.props.currency;
  }

  public get currentBalance(): number | undefined {
    return this.props.currentBalance;
  }

  public get availableBalance(): number | undefined {
    return this.props.availableBalance;
  }

  public get institutionName(): string | undefined {
    return this.props.institutionName;
  }

  public get syncEnabled(): boolean {
    return this.props.syncEnabled;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
