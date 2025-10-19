import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError } from '@lifeos/core/shared/errors';
import crypto from 'crypto';

/**
 * Mailgun Email Parser
 *
 * Parses emails from Mailgun webhook and extracts attachments.
 *
 * Mailgun sends email data as multipart/form-data with:
 * - sender, recipient, subject, body
 * - attachments as separate fields
 * - signature for verification
 */
export class MailgunEmailParser {
  constructor(private readonly signingKey?: string) {}

  /**
   * Parse Mailgun webhook payload
   *
   * @param body Request body from Mailgun webhook
   * @param files Uploaded files from multer
   * @returns Parsed email data or error
   */
  parse(body: any, files?: any): Result<ParsedEmail, BaseError> {
    try {
      // Verify signature if signing key is configured
      if (this.signingKey) {
        const verificationResult = this.verifySignature(body);
        if (verificationResult.isFail()) {
          return Result.fail(verificationResult.error);
        }
      }

      // Extract email metadata
      const sender = body.sender || body.from;
      const recipient = body.recipient || body.to;
      const subject = body.subject || '';
      const bodyPlain = body['body-plain'] || '';
      const bodyHtml = body['body-html'] || '';

      if (!sender || !recipient) {
        return Result.fail(
          new ValidationError('Missing required email fields', [
            { field: 'sender', message: 'Sender is required' },
            { field: 'recipient', message: 'Recipient is required' },
          ])
        );
      }

      // Extract attachments
      const attachments: EmailAttachment[] = [];

      // Mailgun sends attachments as attachment-1, attachment-2, etc.
      const attachmentCount = parseInt(body['attachment-count'] || '0', 10);

      for (let i = 1; i <= attachmentCount; i++) {
        const attachmentKey = `attachment-${i}`;
        const file = files?.find((f: any) => f.fieldname === attachmentKey);

        if (file) {
          attachments.push({
            filename: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          });
        }
      }

      // Parse email data
      const parsedEmail: ParsedEmail = {
        sender,
        recipient,
        subject,
        bodyPlain,
        bodyHtml,
        attachments,
        receivedAt: new Date(),
        metadata: {
          messageId: body['Message-Id'] || body['message-id'],
          inReplyTo: body['In-Reply-To'] || body['in-reply-to'],
          references: body.References || body.references,
        },
      };

      return Result.ok(parsedEmail);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'Failed to parse Mailgun email',
          'EMAIL_PARSE_ERROR',
          400,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Verify Mailgun webhook signature
   *
   * Ensures the request actually came from Mailgun.
   * Uses HMAC-SHA256 verification.
   *
   * @param body Webhook payload
   * @returns Result with success or error
   */
  private verifySignature(body: any): Result<void, BaseError> {
    try {
      const timestamp = body.timestamp;
      const token = body.token;
      const signature = body.signature;

      if (!timestamp || !token || !signature) {
        return Result.fail(
          new ValidationError('Missing signature fields', [
            { field: 'timestamp', message: 'Timestamp is required' },
            { field: 'token', message: 'Token is required' },
            { field: 'signature', message: 'Signature is required' },
          ])
        );
      }

      // Verify timestamp (prevent replay attacks)
      const now = Math.floor(Date.now() / 1000);
      const timestampInt = parseInt(timestamp, 10);

      if (Math.abs(now - timestampInt) > 300) {
        // 5 minute tolerance
        return Result.fail(
          new ValidationError('Signature expired', [
            { field: 'timestamp', message: 'Timestamp too old or in future' },
          ])
        );
      }

      // Compute expected signature
      const data = `${timestamp}${token}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.signingKey!)
        .update(data)
        .digest('hex');

      // Compare signatures (constant-time comparison)
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return Result.fail(
          new ValidationError('Invalid signature', [
            { field: 'signature', message: 'Signature verification failed' },
          ])
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'Signature verification failed',
          'SIGNATURE_VERIFICATION_ERROR',
          401,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Filter PDF attachments
   *
   * Returns only PDF files from attachments.
   *
   * @param attachments Email attachments
   * @returns Array of PDF attachments
   */
  static filterPDFs(attachments: EmailAttachment[]): EmailAttachment[] {
    return attachments.filter((attachment) => {
      // Check MIME type
      if (attachment.contentType === 'application/pdf') {
        return true;
      }

      // Check file extension
      if (attachment.filename.toLowerCase().endsWith('.pdf')) {
        return true;
      }

      // Check magic bytes (%PDF)
      if (attachment.buffer.length >= 4) {
        const header = attachment.buffer.toString('ascii', 0, 4);
        if (header === '%PDF') {
          return true;
        }
      }

      return false;
    });
  }
}

/**
 * Parsed Email
 *
 * Structured email data extracted from Mailgun webhook
 */
export interface ParsedEmail {
  sender: string;
  recipient: string;
  subject: string;
  bodyPlain: string;
  bodyHtml: string;
  attachments: EmailAttachment[];
  receivedAt: Date;
  metadata: {
    messageId?: string;
    inReplyTo?: string;
    references?: string;
  };
}

/**
 * Email Attachment
 *
 * File attached to email
 */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
}
