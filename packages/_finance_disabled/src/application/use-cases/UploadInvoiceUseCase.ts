import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, DatabaseError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { Invoice, InvoiceSource, ExtractionStatus } from '../../domain/entities';
import { IInvoiceRepository, IFileStorage } from '../../domain/interfaces';

/**
 * Upload Invoice Use Case
 *
 * Handles the upload of invoice PDF files with metadata.
 * Creates a draft invoice entity and stores the PDF file.
 *
 * Business Rules:
 * - PDF file is required
 * - File must be a valid PDF (magic bytes check)
 * - Maximum file size: 10MB
 * - Invoice is created in DRAFT status
 * - Extraction status set to PENDING (ready for AI extraction)
 * - File is stored with organized directory structure
 *
 * Process:
 * 1. Validate PDF file
 * 2. Store PDF using file storage service
 * 3. Create draft invoice entity
 * 4. Save invoice to database
 * 5. Publish InvoiceUploaded event
 * 6. Return created invoice
 */
export class UploadInvoiceUseCase {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly fileStorage: IFileStorage,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute invoice upload
   *
   * @param pdfBuffer PDF file contents
   * @param filename Original filename
   * @param source How the invoice was uploaded
   * @param metadata Additional metadata (vendor, category, etc.)
   * @returns Created invoice
   */
  async execute(
    pdfBuffer: Buffer,
    filename: string,
    source: InvoiceSource = InvoiceSource.MANUAL_UPLOAD,
    metadata?: {
      vendorId?: string;
      category?: string;
      tags?: string[];
      notes?: string;
      autoExtract?: boolean; // Whether to trigger AI extraction immediately
    }
  ): Promise<Result<Invoice, BaseError>> {
    // Step 1: Validate PDF file
    const validationResult = this.validatePDF(pdfBuffer, filename);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    // Step 2: Store PDF file
    const storeResult = await this.fileStorage.store(pdfBuffer, filename, {
      contentType: 'application/pdf',
      metadata: {
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    if (storeResult.isFail()) {
      return Result.fail(storeResult.error);
    }

    const pdfPath = storeResult.value;

    // Step 3: Create draft invoice entity
    const invoice = Invoice.createDraft(
      pdfPath,
      source,
      metadata?.vendorId,
      metadata?.category,
      metadata?.tags,
      metadata?.notes
    );

    // Set extraction status to PENDING if auto-extract is enabled
    if (metadata?.autoExtract !== false) {
      invoice.markExtractionPending();
    } else {
      invoice.markExtractionManual(); // User will enter data manually
    }

    // Step 4: Save invoice to database
    const createResult = await this.invoiceRepository.create(invoice);
    if (createResult.isFail()) {
      // Rollback: Delete uploaded file
      await this.fileStorage.delete(pdfPath);
      return Result.fail(createResult.error);
    }

    const createdInvoice = createResult.value;

    // Step 5: Publish InvoiceUploaded event
    await this.eventBus.publish({
      type: 'InvoiceUploaded',
      source: 'finance',
      payload: {
        invoiceId: createdInvoice.id,
        pdfPath: createdInvoice.pdfPath,
        source: createdInvoice.source,
        extractionStatus: createdInvoice.extractionStatus,
        autoExtract: metadata?.autoExtract !== false,
      },
      timestamp: new Date(),
    });

    // Step 6: Return created invoice
    return Result.ok(createdInvoice);
  }

  /**
   * Validate PDF file
   */
  private validatePDF(pdfBuffer: Buffer, filename: string): Result<void, BaseError> {
    // Check file size
    if (pdfBuffer.length === 0) {
      return Result.fail(new ValidationError('PDF file is empty'));
    }

    if (pdfBuffer.length > UploadInvoiceUseCase.MAX_FILE_SIZE) {
      return Result.fail(
        new ValidationError(
          `PDF file too large. Maximum size: ${UploadInvoiceUseCase.MAX_FILE_SIZE / 1024 / 1024}MB`
        )
      );
    }

    // Check PDF magic bytes (file signature)
    if (
      !pdfBuffer.subarray(0, 4).equals(UploadInvoiceUseCase.PDF_MAGIC_BYTES) &&
      !pdfBuffer.subarray(0, 5).toString('utf-8').startsWith('%PDF')
    ) {
      return Result.fail(
        new ValidationError('Invalid PDF file. File must be a valid PDF document.')
      );
    }

    // Check filename
    if (!filename || filename.trim().length === 0) {
      return Result.fail(new ValidationError('Filename is required'));
    }

    return Result.ok(undefined);
  }

  /**
   * Upload multiple invoices in batch
   *
   * @param uploads Array of invoice uploads
   * @returns Results for each upload
   */
  async executeBatch(
    uploads: Array<{
      pdfBuffer: Buffer;
      filename: string;
      source?: InvoiceSource;
      metadata?: {
        vendorId?: string;
        category?: string;
        tags?: string[];
        notes?: string;
        autoExtract?: boolean;
      };
    }>
  ): Promise<Result<Invoice[], BaseError>> {
    const results: Invoice[] = [];
    const errors: BaseError[] = [];

    for (const upload of uploads) {
      const result = await this.execute(
        upload.pdfBuffer,
        upload.filename,
        upload.source,
        upload.metadata
      );

      if (result.isOk()) {
        results.push(result.value);
      } else {
        errors.push(result.error);
      }
    }

    // If any uploads failed, return combined error
    if (errors.length > 0) {
      return Result.fail(
        new DatabaseError(
          `Batch upload completed with ${errors.length} errors out of ${uploads.length} uploads`,
          { errors }
        )
      );
    }

    return Result.ok(results);
  }
}
