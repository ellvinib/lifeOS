import { gmail_v1, google } from 'googleapis';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { ExternalServiceError } from '@lifeOS/core/shared/errors/ExternalServiceError';
import { ValidationError } from '@lifeOS/core/shared/errors/ValidationError';
import {
  IEmailProvider,
  EmailMetadata,
  EmailContent,
} from '../../domain/interfaces/IEmailProvider';

/**
 * Gmail Provider
 *
 * Fetches emails from Gmail using Google Gmail API.
 *
 * Features:
 * - OAuth 2.0 authentication
 * - Full email content fetching
 * - Metadata-only listing
 * - Label support (Gmail's folder system)
 * - History API support (via separate use case)
 *
 * Gmail API documentation:
 * - Get message: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get
 * - List messages: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
 * - History: https://developers.google.com/gmail/api/reference/rest/v1/users.history/list
 *
 * Rate limits:
 * - 250 quota units per user per second
 * - messages.get: 5 units
 * - messages.list: 5 units
 * - history.list: 2 units
 */
export class GmailProvider implements IEmailProvider {
  /**
   * Fetch single email by message ID
   *
   * @param credentials - Gmail OAuth credentials (JSON string)
   * @param messageId - Gmail message ID
   * @returns Full email content
   */
  async fetchEmail(
    credentials: string,
    messageId: string
  ): Promise<Result<EmailContent, BaseError>> {
    try {
      // Parse and create OAuth client
      const authResult = this.createAuthClient(credentials);
      if (authResult.isFail()) {
        return Result.fail(authResult.error);
      }

      const auth = authResult.value;
      const gmail = google.gmail({ version: 'v1', auth });

      // Fetch message with full format
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', // Get full message with headers and body
      });

      const message = response.data;
      if (!message) {
        return Result.fail(
          new ExternalServiceError(
            'Failed to fetch email from Gmail',
            new Error('Empty response'),
            { messageId }
          )
        );
      }

      // Parse message to EmailContent
      const emailContent = this.parseMessageToEmailContent(message);

      return Result.ok(emailContent);
    } catch (error: any) {
      console.error(`Failed to fetch Gmail email ${messageId}:`, error);

      // Handle rate limiting
      if (error.code === 429) {
        return Result.fail(
          new ExternalServiceError(
            'Gmail API rate limit exceeded',
            error,
            { messageId, retryAfter: error.response?.headers?.['retry-after'] }
          )
        );
      }

      return Result.fail(
        new ExternalServiceError(
          'Failed to fetch email from Gmail',
          error,
          { messageId }
        )
      );
    }
  }

  /**
   * List recent emails (metadata only)
   *
   * Note: For Gmail, this is less efficient than History API.
   * Use GmailHistorySyncUseCase for incremental sync.
   *
   * @param credentials - Gmail OAuth credentials (JSON string)
   * @param since - Only fetch emails newer than this date (optional)
   * @param limit - Maximum number of emails to fetch (default: 50)
   * @returns Array of email metadata
   */
  async listEmails(
    credentials: string,
    since?: Date,
    limit: number = 50
  ): Promise<Result<EmailMetadata[], BaseError>> {
    try {
      // Parse and create OAuth client
      const authResult = this.createAuthClient(credentials);
      if (authResult.isFail()) {
        return Result.fail(authResult.error);
      }

      const auth = authResult.value;
      const gmail = google.gmail({ version: 'v1', auth });

      // Build query
      let q = 'in:inbox';
      if (since) {
        const afterDate = Math.floor(since.getTime() / 1000);
        q += ` after:${afterDate}`;
      }

      // List message IDs
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q,
        maxResults: limit,
      });

      const messages = listResponse.data.messages || [];

      // Fetch metadata for each message
      const metadataPromises = messages.map(async (msg) => {
        try {
          const response = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata', // Only get headers, no body
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });

          return this.parseMessageToEmailMetadata(response.data);
        } catch (error) {
          console.error(`Failed to fetch metadata for message ${msg.id}:`, error);
          return null;
        }
      });

      const metadataResults = await Promise.all(metadataPromises);
      const emailMetadata = metadataResults.filter((m): m is EmailMetadata => m !== null);

      return Result.ok(emailMetadata);
    } catch (error: any) {
      console.error('Failed to list Gmail emails:', error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to list emails from Gmail',
          error,
          { since, limit }
        )
      );
    }
  }

  /**
   * Create OAuth2 client from credentials
   */
  private createAuthClient(credentials: string): Result<any, ValidationError> {
    try {
      const parsed = JSON.parse(credentials);

      if (!parsed.accessToken || !parsed.refreshToken) {
        return Result.fail(
          new ValidationError('Invalid Gmail credentials', [
            { field: 'credentials', message: 'Missing accessToken or refreshToken' },
          ])
        );
      }

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
        expiry_date: parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : undefined,
      });

      return Result.ok(oauth2Client);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to parse Gmail credentials', [
          { field: 'credentials', message: 'Invalid JSON format' },
        ])
      );
    }
  }

  /**
   * Parse Gmail message to EmailMetadata
   */
  private parseMessageToEmailMetadata(message: gmail_v1.Schema$Message): EmailMetadata | null {
    try {
      if (!message.id) return null;

      const headers = message.payload?.headers || [];

      // Extract headers
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || 'unknown';
      const toHeader = headers.find((h) => h.name?.toLowerCase() === 'to')?.value || '';
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '(no subject)';
      const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date')?.value;

      // Parse from
      const fromMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/^(.+?)$/);
      const fromAddress = fromMatch ? fromMatch[1] : fromHeader;
      const fromName = fromHeader.replace(/<.*?>/, '').trim() || null;

      // Parse to (can be comma-separated)
      const toAddresses = toHeader
        .split(',')
        .map((t) => {
          const match = t.match(/<(.+?)>/) || t.match(/^(.+?)$/);
          return match ? match[1].trim() : t.trim();
        })
        .filter((t) => t);

      // Get snippet
      const snippet = message.snippet || '';

      // Check for attachments
      const hasAttachments = this.hasAttachments(message.payload);

      // Get labels
      const labels = message.labelIds || [];

      // Parse date
      const timestamp = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate || '0', 10));

      return {
        providerMessageId: message.id,
        from: fromAddress,
        fromName,
        to: toAddresses,
        subject: subjectHeader,
        snippet,
        hasAttachments,
        timestamp,
        labels,
      };
    } catch (error) {
      console.error('Failed to parse Gmail message to metadata:', error);
      return null;
    }
  }

  /**
   * Parse Gmail message to EmailContent
   */
  private parseMessageToEmailContent(message: gmail_v1.Schema$Message): EmailContent {
    const metadata = this.parseMessageToEmailMetadata(message);

    if (!metadata) {
      throw new Error('Failed to parse message metadata');
    }

    // Extract body parts
    const { bodyText, bodyHtml } = this.extractBody(message.payload);

    // Extract attachments
    const attachments = this.extractAttachments(message.payload);

    // Extract additional headers
    const headers = message.payload?.headers || [];
    const ccHeader = headers.find((h) => h.name?.toLowerCase() === 'cc')?.value || '';
    const bccHeader = headers.find((h) => h.name?.toLowerCase() === 'bcc')?.value || '';

    const ccAddresses = ccHeader
      .split(',')
      .map((t) => {
        const match = t.match(/<(.+?)>/) || t.match(/^(.+?)$/);
        return match ? match[1].trim() : t.trim();
      })
      .filter((t) => t);

    const bccAddresses = bccHeader
      .split(',')
      .map((t) => {
        const match = t.match(/<(.+?)>/) || t.match(/^(.+?)$/);
        return match ? match[1].trim() : t.trim();
      })
      .filter((t) => t);

    return {
      ...metadata,
      cc: ccAddresses,
      bcc: bccAddresses,
      bodyText,
      bodyHtml,
      attachments,
    };
  }

  /**
   * Extract body from message payload
   */
  private extractBody(payload: gmail_v1.Schema$MessagePart | undefined): {
    bodyText: string;
    bodyHtml?: string;
  } {
    if (!payload) {
      return { bodyText: '' };
    }

    let bodyText = '';
    let bodyHtml: string | undefined;

    const findPart = (part: gmail_v1.Schema$MessagePart, mimeType: string): string | undefined => {
      if (part.mimeType === mimeType && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          const found = findPart(subPart, mimeType);
          if (found) return found;
        }
      }

      return undefined;
    };

    // Try to find text/plain
    bodyText = findPart(payload, 'text/plain') || '';

    // Try to find text/html
    bodyHtml = findPart(payload, 'text/html');

    // If no text/plain but has text/html, use that as bodyText
    if (!bodyText && bodyHtml) {
      bodyText = bodyHtml.replace(/<[^>]*>/g, ''); // Strip HTML tags
    }

    return { bodyText, bodyHtml };
  }

  /**
   * Extract attachments from message payload
   */
  private extractAttachments(
    payload: gmail_v1.Schema$MessagePart | undefined
  ): Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }> {
    const attachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
    }> = [];

    if (!payload) return attachments;

    const findAttachments = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          contentType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
        });
      }

      if (part.parts) {
        part.parts.forEach((subPart) => findAttachments(subPart));
      }
    };

    findAttachments(payload);

    return attachments;
  }

  /**
   * Check if message has attachments
   */
  private hasAttachments(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
    if (!payload) return false;

    const checkPart = (part: gmail_v1.Schema$MessagePart): boolean => {
      if (part.filename && part.body?.attachmentId) {
        return true;
      }

      if (part.parts) {
        return part.parts.some((subPart) => checkPart(subPart));
      }

      return false;
    };

    return checkPart(payload);
  }
}
