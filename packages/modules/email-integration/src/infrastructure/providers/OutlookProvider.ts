import { Client } from '@microsoft/microsoft-graph-client';
import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { ExternalServiceError } from '@lifeos/core/shared/errors';
import {
  IEmailProvider,
  EmailMetadata,
  EmailContent,
} from '../../domain/interfaces/IEmailProvider';

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
export class OutlookProvider implements IEmailProvider {
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
    const isHtml = message.body?.contentType === 'html';

    return {
      providerMessageId: message.id,
      from: message.from?.emailAddress?.address || 'unknown',
      fromName: message.from?.emailAddress?.name,
      to: (message.toRecipients || []).map((r: any) => r.emailAddress.address),
      cc: (message.ccRecipients || []).map((r: any) => r.emailAddress.address),
      bcc: (message.bccRecipients || []).map((r: any) => r.emailAddress.address),
      subject: message.subject || '(no subject)',
      bodyText: isHtml ? '' : (message.body?.content || ''),
      bodyHtml: isHtml ? message.body?.content : undefined,
      hasAttachments: message.hasAttachments || false,
      attachments: (message.attachments || []).map((att: any) => ({
        id: att.id,
        filename: att.name,
        contentType: att.contentType,
        size: att.size,
      })),
      timestamp: new Date(message.receivedDateTime),
      labels: message.categories || [],
    };
  }
}
