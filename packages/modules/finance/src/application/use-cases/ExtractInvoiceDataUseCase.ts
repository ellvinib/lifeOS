import { Result } from '@lifeOS/core/shared/result';
import {
  BaseError,
  NotFoundError,
  BusinessRuleError,
  DatabaseError,
} from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { Invoice, Vendor, ExtractionStatus, VendorType } from '../../domain/entities';
import {
  IInvoiceRepository,
  IVendorRepository,
  IFileStorage,
} from '../../domain/interfaces';
import { GeminiFlashService } from '../../infrastructure/services';

/**
 * Extract Invoice Data Use Case
 *
 * Uses AI (Gemini Flash) to extract structured data from invoice PDFs.
 * Applies extracted data to invoice entity and auto-creates vendor if needed.
 *
 * Business Rules:
 * - Invoice must exist and be in DRAFT or PENDING status
 * - Invoice must have a valid PDF file
 * - Extraction can only be run once at a time
 * - If vendor is found in extracted data, auto-create vendor
 * - After successful extraction, invoice status changes to PENDING
 * - Extraction status tracks the AI processing state
 *
 * Process:
 * 1. Get invoice entity
 * 2. Validate invoice is ready for extraction
 * 3. Retrieve PDF file from storage
 * 4. Mark extraction as PROCESSING
 * 5. Call Gemini Flash API
 * 6. Parse and validate extracted data
 * 7. Auto-create vendor if needed
 * 8. Apply extracted data to invoice
 * 9. Mark extraction as COMPLETED
 * 10. Publish InvoiceDataExtracted event
 * 11. Return updated invoice
 */
export class ExtractInvoiceDataUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly vendorRepository: IVendorRepository,
    private readonly fileStorage: IFileStorage,
    private readonly geminiService: GeminiFlashService,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute invoice data extraction
   *
   * @param invoiceId Invoice ID
   * @param options Extraction options
   * @returns Updated invoice with extracted data
   */
  async execute(
    invoiceId: string,
    options?: {
      forceReExtract?: boolean; // Re-extract even if already extracted
      manualVendorId?: string; // Override auto-detected vendor
    }
  ): Promise<Result<Invoice, BaseError>> {
    // Step 1: Get invoice entity
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Step 2: Validate invoice is ready for extraction
    const validationResult = this.validateInvoiceForExtraction(invoice, options);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    // Step 3: Retrieve PDF file from storage
    const pdfResult = await this.fileStorage.retrieve(invoice.pdfPath);
    if (pdfResult.isFail()) {
      return Result.fail(
        new DatabaseError('Failed to retrieve invoice PDF for extraction', pdfResult.error)
      );
    }

    const pdfBuffer = pdfResult.value;

    // Step 4: Mark extraction as PROCESSING
    invoice.markExtractionProcessing();
    const updateStatusResult = await this.invoiceRepository.update(invoice);
    if (updateStatusResult.isFail()) {
      return Result.fail(updateStatusResult.error);
    }

    try {
      // Step 5: Call Gemini Flash API
      const extractionResult = await this.geminiService.extractInvoiceData(
        pdfBuffer,
        invoice.pdfPath
      );

      if (extractionResult.isFail()) {
        // Mark extraction as FAILED
        invoice.markExtractionFailed(extractionResult.error.message);
        await this.invoiceRepository.update(invoice);

        await this.eventBus.publish({
          type: 'InvoiceExtractionFailed',
          source: 'finance',
          payload: {
            invoiceId: invoice.id,
            error: extractionResult.error.message,
          },
          timestamp: new Date(),
        });

        return Result.fail(extractionResult.error);
      }

      const extractedData = extractionResult.value;

      // Step 6: Validate extracted data quality
      const qualityCheck = this.validateExtractedData(extractedData);
      if (!qualityCheck.isValid) {
        invoice.markExtractionFailed(
          `Low quality extraction: ${qualityCheck.issues.join(', ')}`
        );
        await this.invoiceRepository.update(invoice);

        return Result.fail(
          new BusinessRuleError(
            'Extracted data quality too low',
            'EXTRACTION_QUALITY_FAILURE'
          )
        );
      }

      // Step 7: Auto-create or find vendor if needed
      let vendorId = options?.manualVendorId || invoice.vendorId;

      if (!vendorId && extractedData.vendorName) {
        const vendorResult = await this.findOrCreateVendor(extractedData);
        if (vendorResult.isOk()) {
          vendorId = vendorResult.value.id;
        }
      }

      // Step 8: Apply extracted data to invoice
      invoice.applyExtractedData(extractedData);

      if (vendorId) {
        invoice.assignVendor(vendorId);
      }

      // Step 9: Mark extraction as COMPLETED
      invoice.markExtractionCompleted();

      // Step 10: Save updated invoice
      const saveResult = await this.invoiceRepository.update(invoice);
      if (saveResult.isFail()) {
        return Result.fail(saveResult.error);
      }

      const updatedInvoice = saveResult.value;

      // Step 11: Publish InvoiceDataExtracted event
      await this.eventBus.publish({
        type: 'InvoiceDataExtracted',
        source: 'finance',
        payload: {
          invoiceId: updatedInvoice.id,
          vendorId,
          extractedData,
          quality: qualityCheck.qualityScore,
        },
        timestamp: new Date(),
      });

      return Result.ok(updatedInvoice);
    } catch (error) {
      // Handle unexpected errors
      invoice.markExtractionFailed(error instanceof Error ? error.message : 'Unknown error');
      await this.invoiceRepository.update(invoice);

      return Result.fail(new DatabaseError('Invoice extraction failed unexpectedly', error));
    }
  }

  /**
   * Validate invoice is ready for extraction
   */
  private validateInvoiceForExtraction(
    invoice: Invoice,
    options?: { forceReExtract?: boolean }
  ): Result<void, BaseError> {
    // Check extraction status
    if (
      invoice.extractionStatus === ExtractionStatus.COMPLETED &&
      !options?.forceReExtract
    ) {
      return Result.fail(
        new BusinessRuleError(
          'Invoice data already extracted. Use forceReExtract option to re-extract.',
          'ALREADY_EXTRACTED'
        )
      );
    }

    if (invoice.extractionStatus === ExtractionStatus.PROCESSING) {
      return Result.fail(
        new BusinessRuleError(
          'Invoice extraction already in progress',
          'EXTRACTION_IN_PROGRESS'
        )
      );
    }

    if (invoice.extractionStatus === ExtractionStatus.MANUAL) {
      return Result.fail(
        new BusinessRuleError(
          'Invoice marked for manual data entry. Change extraction status first.',
          'MANUAL_ENTRY_MODE'
        )
      );
    }

    // Check PDF exists
    if (!invoice.pdfPath || invoice.pdfPath.trim().length === 0) {
      return Result.fail(
        new BusinessRuleError('Invoice has no PDF file attached', 'NO_PDF_FILE')
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Validate quality of extracted data
   */
  private validateExtractedData(
    extractedData: any
  ): { isValid: boolean; qualityScore: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 100;

    // Critical fields (60 points total)
    if (extractedData.total !== undefined && extractedData.total > 0) {
      score += 30;
    } else {
      issues.push('Missing total amount');
    }

    if (extractedData.vendorName && extractedData.vendorName.trim().length > 0) {
      score += 20;
    } else {
      issues.push('Missing vendor name');
    }

    if (extractedData.issueDate) {
      score += 10;
    } else {
      issues.push('Missing issue date');
    }

    // Important fields (30 points total)
    if (extractedData.invoiceNumber && extractedData.invoiceNumber.trim().length > 0) {
      score += 10;
    }

    if (extractedData.subtotal !== undefined && extractedData.vatAmount !== undefined) {
      score += 10;
    }

    if (extractedData.dueDate) {
      score += 10;
    }

    // Nice-to-have fields (10 points total)
    if (extractedData.currency) score += 2;
    if (extractedData.vendorVAT) score += 2;
    if (extractedData.paymentReference) score += 3;
    if (extractedData.lineItems && extractedData.lineItems.length > 0) score += 3;

    const qualityScore = (score / maxScore) * 100;

    // Consider valid if score >= 60% (at least critical fields present)
    const isValid = qualityScore >= 60;

    return { isValid, qualityScore, issues };
  }

  /**
   * Find existing vendor or create new one
   */
  private async findOrCreateVendor(
    extractedData: any
  ): Promise<Result<Vendor, BaseError>> {
    const vendorName = extractedData.vendorName.trim();

    // Try to find existing vendor by name
    const existingResult = await this.vendorRepository.findByName(vendorName);
    if (existingResult.isOk()) {
      return existingResult; // Vendor found
    }

    // Try fuzzy search
    const fuzzyResult = await this.vendorRepository.findByNameLike(vendorName);
    if (fuzzyResult.isOk() && fuzzyResult.value.length > 0) {
      // Return first match
      return Result.ok(fuzzyResult.value[0]);
    }

    // Create new vendor
    const vendor = Vendor.create(vendorName, VendorType.SUPPLIER);

    // Set optional fields from extracted data
    if (extractedData.vendorVAT) {
      vendor.setVATNumber(extractedData.vendorVAT);
    }

    if (extractedData.vendorEmail) {
      vendor.setEmail(extractedData.vendorEmail);
    }

    if (extractedData.vendorPhone) {
      vendor.setPhone(extractedData.vendorPhone);
    }

    if (extractedData.vendorAddress) {
      vendor.setAddress(extractedData.vendorAddress);
    }

    const createResult = await this.vendorRepository.create(vendor);

    if (createResult.isOk()) {
      // Publish VendorCreated event
      await this.eventBus.publish({
        type: 'VendorCreated',
        source: 'finance',
        payload: {
          vendorId: createResult.value.id,
          vendorName: createResult.value.name,
          vendorType: createResult.value.vendorType,
          vatNumber: createResult.value.vatNumber,
          createdBy: 'ai-extraction',
          extractedFrom: extractedData,
        },
        timestamp: new Date(),
      });
    }

    return createResult;
  }

  /**
   * Extract data from multiple invoices in batch
   */
  async executeBatch(
    invoiceIds: string[],
    options?: { forceReExtract?: boolean }
  ): Promise<Result<Invoice[], BaseError>> {
    const results: Invoice[] = [];
    const errors: BaseError[] = [];

    for (const invoiceId of invoiceIds) {
      const result = await this.execute(invoiceId, options);

      if (result.isOk()) {
        results.push(result.value);
      } else {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return Result.fail(
        new DatabaseError(
          `Batch extraction completed with ${errors.length} errors out of ${invoiceIds.length} invoices`,
          { errors }
        )
      );
    }

    return Result.ok(results);
  }
}
