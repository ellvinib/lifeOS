import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError } from '@lifeos/core/shared/errors';
import { IEventBus } from '@lifeos/core/events';
import { InvoiceSource } from '../../domain/value-objects/InvoiceEnums';
import { UploadInvoiceUseCase } from './UploadInvoiceUseCase';
import { ParsedEmail, MailgunEmailParser } from '../../infrastructure/services/MailgunEmailParser';

/**
 * Process Invoice Email Use Case
 *
 * Processes incoming emails with invoice PDFs.
 * Extracts attachments and creates invoice records.
 *
 * Business Rules:
 * - Only process PDF attachments
 * - Sender email becomes vendor identifier
 * - Email subject can contain invoice metadata
 * - Auto-trigger extraction after upload
 *
 * Process:
 * 1. Parse email and extract attachments
 * 2. Filter for PDF files only
 * 3. For each PDF: upload → extract → match
 * 4. Track processing results
 * 5. Publish EmailProcessed event
 * 6. Return summary statistics
 */
export class ProcessInvoiceEmailUseCase {
  constructor(
    private readonly uploadUseCase: UploadInvoiceUseCase,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute email processing
   *
   * @param email Parsed email from Mailgun webhook
   * @param options Processing options
   * @returns Processing summary or error
   */
  async execute(
    email: ParsedEmail,
    options?: {
      autoExtract?: boolean; // Auto-trigger AI extraction (default: true)
      userId?: string; // User ID for invoice ownership
    }
  ): Promise<Result<EmailProcessingSummary, BaseError>> {
    try {
      // Step 1: Filter PDF attachments
      const pdfAttachments = MailgunEmailParser.filterPDFs(email.attachments);

      if (pdfAttachments.length === 0) {
        return Result.fail(
          new ValidationError('No PDF attachments found in email', [
            { field: 'attachments', message: 'Email must contain at least one PDF file' },
          ])
        );
      }

      // Step 2: Process each PDF
      const results: InvoiceUploadResult[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (const attachment of pdfAttachments) {
        const uploadResult = await this.uploadUseCase.execute(
          attachment.buffer,
          attachment.filename,
          InvoiceSource.EMAIL,
          {
            autoExtract: options?.autoExtract !== false, // Default: true
            userId: options?.userId,
            metadata: {
              emailSender: email.sender,
              emailSubject: email.subject,
              emailReceivedAt: email.receivedAt.toISOString(),
              emailMessageId: email.metadata.messageId,
            },
          }
        );

        if (uploadResult.isOk()) {
          successCount++;
          results.push({
            filename: attachment.filename,
            success: true,
            invoiceId: uploadResult.value.id,
          });
        } else {
          failedCount++;
          results.push({
            filename: attachment.filename,
            success: false,
            error: uploadResult.error.message,
          });
        }
      }

      // Step 3: Publish EmailProcessed event
      await this.eventBus.publish({
        type: 'InvoiceEmailProcessed',
        source: 'finance',
        payload: {
          sender: email.sender,
          recipient: email.recipient,
          subject: email.subject,
          attachmentCount: pdfAttachments.length,
          successCount,
          failedCount,
          receivedAt: email.receivedAt,
          results,
        },
        timestamp: new Date(),
      });

      // Step 4: Return summary
      const summary: EmailProcessingSummary = {
        totalAttachments: pdfAttachments.length,
        successCount,
        failedCount,
        results,
        email: {
          sender: email.sender,
          subject: email.subject,
          receivedAt: email.receivedAt,
        },
      };

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'Failed to process invoice email',
          'EMAIL_PROCESSING_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Extract vendor name from email sender
   *
   * Attempts to parse vendor name from email address.
   *
   * @param senderEmail Email address
   * @returns Vendor name or null
   */
  private extractVendorFromEmail(senderEmail: string): string | null {
    // Extract domain
    const match = senderEmail.match(/@([^@]+)$/);
    if (!match) return null;

    const domain = match[1];

    // Remove common TLDs and clean up
    const vendorName = domain
      .replace(/\.(com|org|net|be|nl|fr|de)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize

    return vendorName || null;
  }

  /**
   * Extract invoice number from email subject
   *
   * Looks for patterns like "Invoice #12345" or "Facture 12345"
   *
   * @param subject Email subject
   * @returns Invoice number or null
   */
  private extractInvoiceNumberFromSubject(subject: string): string | null {
    // Common patterns
    const patterns = [
      /invoice\s*#?\s*(\d+)/i,
      /facture\s*#?\s*(\d+)/i,
      /factuur\s*#?\s*(\d+)/i,
      /bill\s*#?\s*(\d+)/i,
      /#(\d{4,})/,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}

/**
 * Email Processing Summary
 *
 * Summary of invoice email processing results
 */
export interface EmailProcessingSummary {
  totalAttachments: number;
  successCount: number;
  failedCount: number;
  results: InvoiceUploadResult[];
  email: {
    sender: string;
    subject: string;
    receivedAt: Date;
  };
}

/**
 * Invoice Upload Result
 *
 * Result of processing a single PDF attachment
 */
export interface InvoiceUploadResult {
  filename: string;
  success: boolean;
  invoiceId?: string;
  error?: string;
}
