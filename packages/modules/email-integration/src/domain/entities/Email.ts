import { EmailProvider } from '../value-objects/EmailProvider';
import { EmailAddress } from '../value-objects/EmailAddress';

/**
 * Email Domain Entity
 *
 * Rich domain model representing an email message (metadata only).
 * Full email content is fetched on-demand (lazy loading).
 *
 * Business Rules:
 * - Email metadata is immutable once created
 * - Only metadata stored (from, to, subject, snippet)
 * - Full content fetched via provider API when needed
 * - Each email unique by (accountId + providerMessageId)
 *
 * Design Pattern: Immutable Value Object
 */
export class Email {
  private readonly _id: string;
  private readonly _accountId: string;
  private readonly _providerMessageId: string;
  private readonly _provider: EmailProvider;
  private readonly _from: EmailAddress;
  private readonly _to: EmailAddress[];
  private readonly _subject: string;
  private readonly _snippet: string;
  private readonly _hasAttachments: boolean;
  private readonly _timestamp: Date;
  private readonly _labels: string[];
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: {
    id: string;
    accountId: string;
    providerMessageId: string;
    provider: EmailProvider;
    from: EmailAddress;
    to: EmailAddress[];
    subject: string;
    snippet: string;
    hasAttachments: boolean;
    timestamp: Date;
    labels?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this._id = props.id;
    this._accountId = props.accountId;
    this._providerMessageId = props.providerMessageId;
    this._provider = props.provider;
    this._from = props.from;
    this._to = props.to;
    this._subject = props.subject;
    this._snippet = props.snippet;
    this._hasAttachments = props.hasAttachments;
    this._timestamp = props.timestamp;
    this._labels = props.labels || [];
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  /**
   * Create new Email entity
   */
  static create(props: {
    id: string;
    accountId: string;
    providerMessageId: string;
    provider: EmailProvider;
    from: EmailAddress;
    to: EmailAddress[];
    subject: string;
    snippet: string;
    hasAttachments: boolean;
    timestamp: Date;
    labels?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }): Email {
    return new Email(props);
  }

  /**
   * Validate entity invariants
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new Error('Email ID is required');
    }

    if (!this._accountId || this._accountId.trim().length === 0) {
      throw new Error('Account ID is required');
    }

    if (!this._providerMessageId || this._providerMessageId.trim().length === 0) {
      throw new Error('Provider message ID is required');
    }

    if (!this._from) {
      throw new Error('From address is required');
    }

    if (!this._to || this._to.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!this._subject) {
      throw new Error('Subject is required (use empty string for no subject)');
    }

    if (this._snippet.length > 500) {
      throw new Error('Snippet must be 500 characters or less');
    }

    if (!this._timestamp) {
      throw new Error('Timestamp is required');
    }
  }

  // ========================================
  // Business Logic Methods
  // ========================================

  /**
   * Check if email is from a specific domain
   * @param domain - Domain to check (e.g., "example.com")
   * @returns True if sender's email is from the domain
   */
  isFromDomain(domain: string): boolean {
    return this._from.isFromDomain(domain);
  }

  /**
   * Check if email contains a keyword in subject or snippet
   * @param keyword - Keyword to search for (case-insensitive)
   * @returns True if keyword found in subject or snippet
   */
  containsKeyword(keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase();
    const subjectMatches = this._subject.toLowerCase().includes(lowerKeyword);
    const snippetMatches = this._snippet.toLowerCase().includes(lowerKeyword);

    return subjectMatches || snippetMatches;
  }

  /**
   * Check if email contains multiple keywords (AND logic)
   * @param keywords - Array of keywords to search for
   * @returns True if ALL keywords found
   */
  containsAllKeywords(keywords: string[]): boolean {
    return keywords.every((keyword) => this.containsKeyword(keyword));
  }

  /**
   * Check if email contains any of the keywords (OR logic)
   * @param keywords - Array of keywords to search for
   * @returns True if ANY keyword found
   */
  containsAnyKeyword(keywords: string[]): boolean {
    return keywords.some((keyword) => this.containsKeyword(keyword));
  }

  /**
   * Check if email is older than a certain number of days
   * @param days - Number of days
   * @returns True if email timestamp is older than specified days
   */
  isOlderThan(days: number): boolean {
    const daysInMs = days * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - daysInMs);
    return this._timestamp < cutoffDate;
  }

  /**
   * Check if email is newer than a certain number of days
   * @param days - Number of days
   * @returns True if email timestamp is newer than specified days
   */
  isNewerThan(days: number): boolean {
    return !this.isOlderThan(days);
  }

  /**
   * Check if email needs processing based on metadata
   * This is a placeholder - modules can override with their own logic
   * @returns True if email should be processed (default: true for all)
   */
  needsProcessing(): boolean {
    // Default: all emails need processing
    // Modules can implement more sophisticated filtering
    return true;
  }

  /**
   * Check if email has a specific label
   * @param label - Label to check for
   * @returns True if email has the label
   */
  hasLabel(label: string): boolean {
    return this._labels.includes(label);
  }

  /**
   * Check if email has any of the specified labels
   * @param labels - Array of labels to check
   * @returns True if email has any of the labels
   */
  hasAnyLabel(labels: string[]): boolean {
    return labels.some((label) => this.hasLabel(label));
  }

  /**
   * Check if email is sent to a specific address
   * @param address - Email address to check
   * @returns True if email is sent to the address
   */
  isSentTo(address: string): boolean {
    return this._to.some((recipient) => recipient.address === address);
  }

  /**
   * Check if email has attachments
   */
  hasAttachments(): boolean {
    return this._hasAttachments;
  }

  /**
   * Get a preview of the email (first 100 chars of snippet)
   */
  getPreview(): string {
    return this._snippet.substring(0, 100) + (this._snippet.length > 100 ? '...' : '');
  }

  // ========================================
  // Getters (Immutable)
  // ========================================

  get id(): string {
    return this._id;
  }

  get accountId(): string {
    return this._accountId;
  }

  get providerMessageId(): string {
    return this._providerMessageId;
  }

  get provider(): EmailProvider {
    return this._provider;
  }

  get from(): EmailAddress {
    return this._from;
  }

  get to(): EmailAddress[] {
    // Return copy to prevent mutation
    return [...this._to];
  }

  get subject(): string {
    return this._subject;
  }

  get snippet(): string {
    return this._snippet;
  }

  get hasAttachmentsFlag(): boolean {
    return this._hasAttachments;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get labels(): string[] {
    // Return copy to prevent mutation
    return [...this._labels];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Convert to plain object (for logging, debugging)
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      accountId: this._accountId,
      providerMessageId: this._providerMessageId,
      provider: this._provider,
      from: {
        address: this._from.address,
        name: this._from.name,
      },
      to: this._to.map((recipient) => ({
        address: recipient.address,
        name: recipient.name,
      })),
      subject: this._subject,
      snippet: this._snippet,
      hasAttachments: this._hasAttachments,
      timestamp: this._timestamp.toISOString(),
      labels: this._labels,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  /**
   * Check equality with another Email
   * Two emails are equal if they have the same ID
   */
  equals(other: Email): boolean {
    if (!other) return false;
    return this._id === other._id;
  }
}
