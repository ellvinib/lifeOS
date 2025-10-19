import { Request, Response, NextFunction } from 'express';
import { IEventBus } from '@lifeos/core/events';
import { MailgunEmailParser } from '../../infrastructure/services/MailgunEmailParser';
import { ProcessInvoiceEmailUseCase } from '../../application/use-cases/ProcessInvoiceEmailUseCase';
import { UploadInvoiceUseCase } from '../../application/use-cases/UploadInvoiceUseCase';
import { IInvoiceRepository, IFileStorage } from '../../domain/interfaces';
import { GeminiFlashService } from '../../infrastructure/services/GeminiFlashService';

/**
 * Webhook Controller
 *
 * Handles incoming webhooks from external services.
 * Currently supports: Mailgun (invoice emails)
 *
 * Responsibilities:
 * - Parse webhook payloads
 * - Verify signatures
 * - Trigger processing use cases
 * - Return 200 OK quickly (don't block webhook)
 */
export class WebhookController {
  private readonly emailParser: MailgunEmailParser;
  private readonly processEmailUseCase: ProcessInvoiceEmailUseCase;

  constructor(
    invoiceRepository: IInvoiceRepository,
    fileStorage: IFileStorage,
    geminiService: GeminiFlashService,
    private readonly eventBus: IEventBus,
    mailgunSigningKey?: string
  ) {
    this.emailParser = new MailgunEmailParser(mailgunSigningKey);

    // Create upload use case
    const uploadUseCase = new UploadInvoiceUseCase(
      invoiceRepository,
      fileStorage,
      eventBus
    );

    // Create process email use case
    this.processEmailUseCase = new ProcessInvoiceEmailUseCase(uploadUseCase, eventBus);
  }

  /**
   * POST /webhooks/mailgun - Handle Mailgun webhook
   *
   * Receives invoice emails forwarded by Mailgun.
   * Processes PDF attachments and creates invoice records.
   */
  async handleMailgunWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Parse email from Mailgun payload
      const parseResult = this.emailParser.parse(req.body, req.files);

      if (parseResult.isFail()) {
        next(parseResult.error);
        return;
      }

      const parsedEmail = parseResult.value;

      // Return 200 OK immediately (Mailgun requires fast response)
      // Process email asynchronously
      res.status(200).json({
        success: true,
        message: 'Email received and queued for processing',
        attachments: parsedEmail.attachments.length,
      });

      // Process email in background (don't await)
      this.processEmailAsync(parsedEmail).catch((error) => {
        console.error('Error processing email:', error);
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process email asynchronously
   *
   * Called after webhook response is sent.
   * Processes PDFs and creates invoices.
   */
  private async processEmailAsync(email: any): Promise<void> {
    try {
      const result = await this.processEmailUseCase.execute(email, {
        autoExtract: true,
      });

      if (result.isOk()) {
        console.log(
          `✅ Processed email from ${email.sender}: ${result.value.successCount}/${result.value.totalAttachments} invoices created`
        );
      } else {
        console.error(`❌ Failed to process email from ${email.sender}:`, result.error.message);
      }
    } catch (error) {
      console.error('Error in async email processing:', error);
    }
  }

  /**
   * GET /webhooks/mailgun - Mailgun route verification
   *
   * Mailgun sends a GET request to verify the webhook URL.
   */
  async verifyMailgunWebhook(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Mailgun webhook endpoint is active',
    });
  }
}
