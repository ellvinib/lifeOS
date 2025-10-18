import { Client } from '@microsoft/microsoft-graph-client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ExternalServiceError } from '@lifeOS/core/shared/errors';
import { EmailAddress } from '../../domain/value-objects/EmailAddress';

/**
 * Email metadata (lightweight, for filtering)
 */
export interface EmailMetadata {
  providerMessageId: string;
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  snippet: string;
  hasAttachments: boolean;
  timestamp: Date;
  labels: string[];
}

/**
 * Full email content (fetched on-demand)
 */
export interface EmailContent extends EmailMetadata {
  body: string;
  htmlBody?: string;
  attachments: Array<{
    id: string;
    name: string;
    contentType: string;
    size: number;
  }>;
}

/**
 * Outlook Provider
 *
 * Fetches emails from Microsoft Outlook/Office 365 using Graph API.
 *
 * Microsoft Graph API documentation:
 * - List messages: https://docs.microsoft.com/en-us/graph/api/user-list-messages
 * - Get message: https://docs.microsoft.com/en-us/graph/api/message-get
 *
 * Rate limits:
 * - 10,000 requests per 10 minutes per app per user
 */
export class OutlookProvider {
  constructor(
    private readonly graphClientFactory: (accessToken: string) => Client
  ) {}

  /**
   * Fetch single email by message ID
   *
   * @param accessToken - Microsoft Graph access token
   * @param messageId - Outlook message ID
   * @returns Full email content
   */
  async fetchEmail(
    accessToken: string,
    messageId: string
  ): Promise<Result<EmailContent, BaseError>> {
    try {
      const client = this.graphClientFactory(accessToken);

      // Fetch message with all fields
      const message = await client
        .api(`/me/messages/${messageId}`)
        .select(
          'id,subject,from,toRecipients,receivedDateTime,bodyPreview,' +
            'body,hasAttachments,isRead,categories'
        )
        .expand('attachments')
        .get();

      const emailContent = this.mapToEmailContent(message);

      return Result.ok(emailContent);
    } catch (error: any) {
      console.error(`Failed to fetch Outlook email ${messageId}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to fetch email from Outlook',
          error,
          {
            messageId,
          }
        )
      );
    }
  }

  /**
   * List recent emails (metadata only)
   *
   * @param accessToken - Microsoft Graph access token
   * @param since - Only fetch emails newer than this date (optional)
   * @param limit - Maximum number of emails to fetch (default: 50)
   * @returns Array of email metadata
   */
  async listEmails(
    accessToken: string,
    since?: Date,
    limit: number = 50
  ): Promise<Result<EmailMetadata[], BaseError>> {
    try {
      const client = this.graphClientFactory(accessToken);

      // Build API request
      let request = client
        .api('/me/messages')
        .select(
          'id,subject,from,toRecipients,receivedDateTime,bodyPreview,' +
            'hasAttachments,isRead,categories'
        )
        .orderby('receivedDateTime DESC')
        .top(limit);

      // Filter by date if provided
      if (since) {
        const isoDate = since.toISOString();
        request = request.filter(`receivedDateTime ge ${isoDate}`);
      }

      const response = await request.get();
      const messages = response.value || [];

      const emailMetadata = messages.map((msg: any) => this.mapToEmailMetadata(msg));

      return Result.ok(emailMetadata);
    } catch (error: any) {
      console.error('Failed to list Outlook emails:', error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to list emails from Outlook',
          error,
          { since, limit }
        )
      );
    }
  }

  /**
   * Map Microsoft Graph message to EmailMetadata
   */
  private mapToEmailMetadata(message: any): EmailMetadata {
    return {
      providerMessageId: message.id,
      from: message.from?.emailAddress?.address || 'unknown',
      fromName: message.from?.emailAddress?.name,
      to: (message.toRecipients || []).map((r: any) => r.emailAddress.address),
      subject: message.subject || '(no subject)',
      snippet: message.bodyPreview || '',
      hasAttachments: message.hasAttachments || false,
      timestamp: new Date(message.receivedDateTime),
      labels: message.categories || [],
    };
  }

  /**
   * Map Microsoft Graph message to EmailContent
   */
  private mapToEmailContent(message: any): EmailContent {
    const metadata = this.mapToEmailMetadata(message);

    return {
      ...metadata,
      body: message.body?.content || '',
      htmlBody: message.body?.contentType === 'html' ? message.body.content : undefined,
      attachments: (message.attachments || []).map((att: any) => ({
        id: att.id,
        name: att.name,
        contentType: att.contentType,
        size: att.size,
      })),
    };
  }
}
