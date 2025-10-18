import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';

/**
 * Email Metadata
 *
 * Lightweight metadata for filtering and display.
 * Full content fetched on-demand (lazy loading).
 */
export interface EmailMetadata {
  providerMessageId: string;
  from: string;
  fromName?: string | null;
  to: string[];
  subject: string;
  snippet: string; // First ~500 chars of body
  hasAttachments: boolean;
  timestamp: Date;
  labels?: string[];
}

/**
 * Full Email Content
 *
 * Complete email including body, headers, and attachments.
 * Only fetched when explicitly requested.
 */
export interface EmailContent {
  providerMessageId: string;
  from: string;
  fromName?: string | null;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string; // Plain text body
  bodyHtml?: string; // HTML body (optional)
  hasAttachments: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
  timestamp: Date;
  labels?: string[];
  headers?: Record<string, string>; // Raw email headers
}

/**
 * Email Provider Interface
 *
 * Provider-agnostic interface for email operations.
 * Implementations: OutlookProvider, GmailProvider, SmtpProvider
 *
 * Design Pattern: Strategy Pattern
 * - Each provider implements this interface
 * - SyncEmailsUseCase doesn't care which provider
 * - Easy to add new providers
 */
export interface IEmailProvider {
  /**
   * Fetch full email content by message ID
   *
   * This is the "lazy loading" operation - only called when needed.
   *
   * @param credentials - Decrypted provider credentials (access token, etc.)
   * @param messageId - Provider's message ID
   * @returns Full email content or error
   */
  fetchEmail(credentials: string, messageId: string): Promise<Result<EmailContent, BaseError>>;

  /**
   * List email metadata (lightweight)
   *
   * Used for sync operations to get metadata only.
   *
   * @param credentials - Decrypted provider credentials
   * @param since - Only fetch emails after this date (optional)
   * @param limit - Max number of emails to fetch (default: 50)
   * @returns Array of email metadata or error
   */
  listEmails(
    credentials: string,
    since?: Date,
    limit?: number
  ): Promise<Result<EmailMetadata[], BaseError>>;

  /**
   * Download attachment by ID
   *
   * @param credentials - Decrypted provider credentials
   * @param messageId - Provider's message ID
   * @param attachmentId - Attachment ID
   * @returns Attachment content as Buffer or error
   */
  downloadAttachment?(
    credentials: string,
    messageId: string,
    attachmentId: string
  ): Promise<Result<Buffer, BaseError>>;
}
