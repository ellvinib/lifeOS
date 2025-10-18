import { connect as imapConnect, Connection, ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
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
 * SMTP Credentials (stored encrypted)
 */
export interface SmtpCredentials {
  username: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost?: string;
  smtpPort?: number;
}

/**
 * SMTP/IMAP Provider
 *
 * Fetches emails from IMAP servers using username/password authentication.
 *
 * Features:
 * - IMAP connection for reading emails
 * - No webhook support (uses IMAP IDLE or polling)
 * - Supports all standard IMAP servers (Gmail, Outlook.com, custom)
 *
 * Libraries Used:
 * - imapflow: Modern IMAP client with IDLE support
 * - mailparser: Parse MIME messages to extract metadata
 *
 * Performance:
 * - Connection pooling recommended for production
 * - IDLE mode for pseudo-push notifications
 * - Fallback to polling (every 5 minutes)
 */
export class SmtpProvider implements IEmailProvider {
  /**
   * Fetch single email by UID
   *
   * @param credentials - SMTP credentials (JSON string)
   * @param messageId - IMAP UID (not message-id header)
   * @returns Full email content
   */
  async fetchEmail(
    credentials: string,
    messageId: string
  ): Promise<Result<EmailContent, BaseError>> {
    let client: ImapFlow | null = null;

    try {
      // Parse credentials
      const creds = this.parseCredentials(credentials);
      if (creds.isFail()) {
        return Result.fail(creds.error);
      }

      const { username, password, imapHost, imapPort } = creds.value;

      // Connect to IMAP
      client = new ImapFlow({
        host: imapHost,
        port: imapPort,
        secure: imapPort === 993, // SSL/TLS for port 993
        auth: {
          user: username,
          pass: password,
        },
        logger: false,
      });

      await client.connect();

      // Select INBOX
      await client.mailboxOpen('INBOX');

      // Fetch message by UID
      const uid = parseInt(messageId, 10);
      if (isNaN(uid)) {
        return Result.fail(
          new ValidationError('Invalid message UID', [
            { field: 'messageId', message: 'Must be a numeric UID' },
          ])
        );
      }

      // Fetch full message
      const message = await client.fetchOne(uid.toString(), {
        source: true, // Get raw MIME
        envelope: true,
        bodyStructure: true,
      });

      if (!message || !message.source) {
        return Result.fail(
          new ExternalServiceError(
            'Failed to fetch email from IMAP',
            new Error('Message not found'),
            { messageId }
          )
        );
      }

      // Parse MIME message
      const parsed = await simpleParser(message.source);

      // Map to EmailContent
      const emailContent = this.mapToEmailContent(messageId, parsed);

      return Result.ok(emailContent);
    } catch (error: any) {
      console.error(`Failed to fetch SMTP email ${messageId}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to fetch email from IMAP server',
          error,
          { messageId }
        )
      );
    } finally {
      // Close connection
      if (client) {
        try {
          await client.logout();
        } catch (err) {
          // Ignore logout errors
        }
      }
    }
  }

  /**
   * List recent emails (metadata only)
   *
   * @param credentials - SMTP credentials (JSON string)
   * @param since - Only fetch emails newer than this date (optional)
   * @param limit - Maximum number of emails to fetch (default: 50)
   * @returns Array of email metadata
   */
  async listEmails(
    credentials: string,
    since?: Date,
    limit: number = 50
  ): Promise<Result<EmailMetadata[], BaseError>> {
    let client: ImapFlow | null = null;

    try {
      // Parse credentials
      const creds = this.parseCredentials(credentials);
      if (creds.isFail()) {
        return Result.fail(creds.error);
      }

      const { username, password, imapHost, imapPort } = creds.value;

      // Connect to IMAP
      client = new ImapFlow({
        host: imapHost,
        port: imapPort,
        secure: imapPort === 993,
        auth: {
          user: username,
          pass: password,
        },
        logger: false,
      });

      await client.connect();

      // Select INBOX
      const mailbox = await client.mailboxOpen('INBOX');

      // Build search criteria
      const searchCriteria: any = { seen: false }; // Unread emails

      if (since) {
        searchCriteria.since = since;
      }

      // Search for messages
      const messages = [];

      // If we have a since date, search for those messages
      // Otherwise, get the latest N messages
      let uids: number[];

      if (since) {
        const searchResults = await client.search(searchCriteria);
        uids = Array.isArray(searchResults) ? searchResults : [];
      } else {
        // Get latest N messages by UID
        const exists = mailbox.exists || 0;
        const start = Math.max(1, exists - limit + 1);
        uids = Array.from({ length: Math.min(limit, exists) }, (_, i) => start + i);
      }

      // Fetch metadata for each message
      for await (const message of client.fetch(
        uids.length > 0 ? uids.join(',') : '1:*',
        {
          envelope: true,
          bodyStructure: true,
          uid: true,
        },
        { uid: true }
      )) {
        const metadata = this.mapToEmailMetadata(message);
        if (metadata) {
          messages.push(metadata);
        }

        // Limit results
        if (messages.length >= limit) {
          break;
        }
      }

      return Result.ok(messages);
    } catch (error: any) {
      console.error('Failed to list SMTP emails:', error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to list emails from IMAP server',
          error,
          { since, limit }
        )
      );
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch (err) {
          // Ignore logout errors
        }
      }
    }
  }

  /**
   * Parse credentials from JSON string
   */
  private parseCredentials(credentials: string): Result<SmtpCredentials, ValidationError> {
    try {
      const parsed = JSON.parse(credentials) as SmtpCredentials;

      // Validate required fields
      if (!parsed.username || !parsed.password || !parsed.imapHost || !parsed.imapPort) {
        return Result.fail(
          new ValidationError('Invalid SMTP credentials', [
            { field: 'credentials', message: 'Missing required fields' },
          ])
        );
      }

      return Result.ok(parsed);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to parse credentials', [
          { field: 'credentials', message: 'Invalid JSON format' },
        ])
      );
    }
  }

  /**
   * Map IMAP message to EmailMetadata
   */
  private mapToEmailMetadata(message: any): EmailMetadata | null {
    try {
      const envelope = message.envelope;
      if (!envelope) {
        return null;
      }

      // Extract sender
      const from = envelope.from?.[0];
      const fromAddress = from?.address || 'unknown';
      const fromName = from?.name || null;

      // Extract recipients
      const to = (envelope.to || []).map((r: any) => r.address);

      // Extract subject
      const subject = envelope.subject || '(no subject)';

      // Check for attachments
      const hasAttachments = this.hasAttachments(message.bodyStructure);

      // Get snippet from bodyStructure (first text part preview)
      const snippet = this.extractSnippet(message.bodyStructure) || '';

      return {
        providerMessageId: message.uid.toString(),
        from: fromAddress,
        fromName,
        to,
        subject,
        snippet,
        hasAttachments,
        timestamp: envelope.date || new Date(),
        labels: [], // IMAP doesn't have labels like Gmail
      };
    } catch (error) {
      console.error('Failed to map IMAP message to metadata:', error);
      return null;
    }
  }

  /**
   * Map parsed MIME message to EmailContent
   */
  private mapToEmailContent(messageId: string, parsed: ParsedMail): EmailContent {
    const from = parsed.from?.value?.[0];
    const fromAddress = from?.address || 'unknown';
    const fromName = from?.name || null;

    const to = (parsed.to?.value || []).map((r: any) => r.address);
    const cc = (parsed.cc?.value || []).map((r: any) => r.address);
    const bcc = (parsed.bcc?.value || []).map((r: any) => r.address);

    const subject = parsed.subject || '(no subject)';
    const bodyText = parsed.text || '';
    const bodyHtml = parsed.html || undefined;

    const attachments = (parsed.attachments || []).map((att) => ({
      id: att.contentId || att.checksum || '',
      filename: att.filename || 'attachment',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || 0,
    }));

    return {
      providerMessageId: messageId,
      from: fromAddress,
      fromName,
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      hasAttachments: attachments.length > 0,
      attachments,
      timestamp: parsed.date || new Date(),
      labels: [],
    };
  }

  /**
   * Check if message has attachments based on body structure
   */
  private hasAttachments(bodyStructure: any): boolean {
    if (!bodyStructure) {
      return false;
    }

    // Check if any part is an attachment
    const checkPart = (part: any): boolean => {
      if (!part) return false;

      // Check disposition
      if (part.disposition === 'attachment') {
        return true;
      }

      // Check child parts recursively
      if (part.childNodes && Array.isArray(part.childNodes)) {
        return part.childNodes.some((child: any) => checkPart(child));
      }

      return false;
    };

    return checkPart(bodyStructure);
  }

  /**
   * Extract snippet from body structure (first text part)
   */
  private extractSnippet(bodyStructure: any): string | null {
    if (!bodyStructure) {
      return null;
    }

    // Find first text/plain part
    const findTextPart = (part: any): string | null => {
      if (!part) return null;

      // Check if this is a text part
      if (part.type === 'text/plain' && part.preview) {
        return part.preview.substring(0, 500);
      }

      // Check child parts recursively
      if (part.childNodes && Array.isArray(part.childNodes)) {
        for (const child of part.childNodes) {
          const text = findTextPart(child);
          if (text) return text;
        }
      }

      return null;
    };

    return findTextPart(bodyStructure);
  }
}
