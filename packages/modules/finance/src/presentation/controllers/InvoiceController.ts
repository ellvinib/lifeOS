import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import {
  UploadInvoiceUseCase,
  ExtractInvoiceDataUseCase,
  GetInvoiceUseCase,
  ListInvoicesUseCase,
  UpdateInvoiceUseCase,
  DeleteInvoiceUseCase,
  InvoiceDTOMapper,
} from '../../application';
import {
  InvoiceRepository,
  VendorRepository,
  InvoiceTransactionMatchRepository,
  LocalFileStorage,
  GeminiFlashService,
} from '../../infrastructure';

/**
 * Invoice Controller
 *
 * Handles HTTP requests for invoice operations.
 * Thin controller that delegates to use cases.
 *
 * Endpoints:
 * - POST   /invoices/upload          - Upload invoice PDF
 * - POST   /invoices/batch-upload    - Upload multiple invoices
 * - POST   /invoices/:id/extract     - Extract invoice data with AI
 * - POST   /invoices/batch-extract   - Extract multiple invoices
 * - GET    /invoices                 - List invoices with filters
 * - GET    /invoices/statistics      - Get invoice statistics
 * - GET    /invoices/unmatched       - Get unmatched invoices
 * - GET    /invoices/pending         - Get pending invoices
 * - GET    /invoices/overdue         - Get overdue invoices
 * - GET    /invoices/needs-extraction - Get invoices needing extraction
 * - GET    /invoices/:id             - Get single invoice
 * - GET    /invoices/:id/download    - Download invoice PDF
 * - PUT    /invoices/:id             - Update invoice
 * - DELETE /invoices/:id             - Delete invoice
 * - POST   /invoices/batch-delete    - Delete multiple invoices
 */
export class InvoiceController {
  private readonly uploadUseCase: UploadInvoiceUseCase;
  private readonly extractUseCase: ExtractInvoiceDataUseCase;
  private readonly getUseCase: GetInvoiceUseCase;
  private readonly listUseCase: ListInvoicesUseCase;
  private readonly updateUseCase: UpdateInvoiceUseCase;
  private readonly deleteUseCase: DeleteInvoiceUseCase;
  private readonly fileStorage: LocalFileStorage;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
    geminiApiKey: string,
    fileStorageBasePath: string = './data'
  ) {
    // Initialize repositories
    const invoiceRepo = new InvoiceRepository(prisma);
    const vendorRepo = new VendorRepository(prisma);
    const matchRepo = new InvoiceTransactionMatchRepository(prisma);

    // Initialize services
    this.fileStorage = new LocalFileStorage(fileStorageBasePath);
    const geminiService = new GeminiFlashService(geminiApiKey);

    // Initialize use cases
    this.uploadUseCase = new UploadInvoiceUseCase(invoiceRepo, this.fileStorage, eventBus);
    this.extractUseCase = new ExtractInvoiceDataUseCase(
      invoiceRepo,
      vendorRepo,
      this.fileStorage,
      geminiService,
      eventBus
    );
    this.getUseCase = new GetInvoiceUseCase(invoiceRepo);
    this.listUseCase = new ListInvoicesUseCase(invoiceRepo);
    this.updateUseCase = new UpdateInvoiceUseCase(invoiceRepo, eventBus);
    this.deleteUseCase = new DeleteInvoiceUseCase(
      invoiceRepo,
      matchRepo,
      this.fileStorage,
      eventBus
    );
  }

  /**
   * Upload invoice PDF
   * POST /invoices/upload
   */
  async uploadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // File should be uploaded via multer middleware
      if (!req.file) {
        res.status(400).json({ error: 'PDF file is required' });
        return;
      }

      const pdfBuffer = req.file.buffer;
      const filename = req.file.originalname;

      const { vendorId, category, tags, notes, autoExtract, source } = req.body;

      const result = await this.uploadUseCase.execute(pdfBuffer, filename, source, {
        vendorId,
        category,
        tags,
        notes,
        autoExtract,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const invoice = result.value;
      const pdfUrlResult = await this.fileStorage.getUrl(invoice.pdfPath);
      const pdfUrl = pdfUrlResult.isOk() ? pdfUrlResult.value : undefined;

      res.status(201).json({
        success: true,
        data: InvoiceDTOMapper.toDTO(invoice, pdfUrl),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Extract invoice data with AI
   * POST /invoices/:id/extract
   */
  async extractInvoiceData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { forceReExtract, manualVendorId } = req.body;

      const result = await this.extractUseCase.execute(id, {
        forceReExtract,
        manualVendorId,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const invoice = result.value;
      const pdfUrlResult = await this.fileStorage.getUrl(invoice.pdfPath);
      const pdfUrl = pdfUrlResult.isOk() ? pdfUrlResult.value : undefined;

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTO(invoice, pdfUrl),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single invoice
   * GET /invoices/:id
   */
  async getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.getUseCase.execute(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const invoice = result.value;
      const pdfUrlResult = await this.fileStorage.getUrl(invoice.pdfPath);
      const pdfUrl = pdfUrlResult.isOk() ? pdfUrlResult.value : undefined;

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTO(invoice, pdfUrl),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List invoices with filters
   * GET /invoices
   */
  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = InvoiceDTOMapper.fromFilterDTO(req.query as any);

      const result = await this.listUseCase.execute(filters);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const invoices = result.value;

      // Get count for pagination
      const countResult = await this.listUseCase.count(filters);
      const total = countResult.isOk() ? countResult.value : invoices.length;

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toListDTO(
          invoices,
          filters.page || 1,
          filters.limit || 50,
          total
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update invoice
   * PUT /invoices/:id
   */
  async updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updates = InvoiceDTOMapper.fromUpdateDTO(req.body);

      const result = await this.updateUseCase.execute(id, updates);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const invoice = result.value;
      const pdfUrlResult = await this.fileStorage.getUrl(invoice.pdfPath);
      const pdfUrl = pdfUrlResult.isOk() ? pdfUrlResult.value : undefined;

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTO(invoice, pdfUrl),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete invoice
   * DELETE /invoices/:id
   */
  async deleteInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { force, keepFile } = req.query;

      const result = await this.deleteUseCase.execute(id, {
        force: force === 'true',
        keepFile: keepFile === 'true',
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Invoice deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download invoice PDF
   * GET /invoices/:id/download
   */
  async downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Get invoice to get PDF path
      const invoiceResult = await this.getUseCase.execute(id);
      if (invoiceResult.isFail()) {
        next(invoiceResult.error);
        return;
      }

      const invoice = invoiceResult.value;

      // Retrieve PDF file
      const pdfResult = await this.fileStorage.retrieve(invoice.pdfPath);
      if (pdfResult.isFail()) {
        next(pdfResult.error);
        return;
      }

      const pdfBuffer = pdfResult.value;

      // Set headers for PDF download
      const filename = invoice.invoiceNumber
        ? `invoice_${invoice.invoiceNumber}.pdf`
        : `invoice_${invoice.id}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice statistics
   * GET /invoices/statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listUseCase.getStatistics();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unmatched invoices
   * GET /invoices/unmatched
   */
  async getUnmatched(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listUseCase.getUnmatched();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTOArray(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending invoices
   * GET /invoices/pending
   */
  async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listUseCase.getPending();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTOArray(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overdue invoices
   * GET /invoices/overdue
   */
  async getOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listUseCase.getOverdue();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTOArray(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoices needing extraction
   * GET /invoices/needs-extraction
   */
  async getNeedsExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listUseCase.getNeedingExtraction();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTOArray(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch upload invoices
   * POST /invoices/batch-upload
   */
  async batchUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Files should be uploaded via multer middleware (array)
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ error: 'At least one PDF file is required' });
        return;
      }

      const uploads = req.files.map((file, index) => ({
        pdfBuffer: file.buffer,
        filename: file.originalname,
        metadata: req.body.invoices?.[index] || {},
      }));

      const result = await this.uploadUseCase.executeBatch(uploads);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(201).json({
        success: true,
        data: InvoiceDTOMapper.toDTOArray(result.value),
        count: result.value.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch extract invoices
   * POST /invoices/batch-extract
   */
  async batchExtract(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceIds, forceReExtract } = req.body;

      const result = await this.extractUseCase.executeBatch(invoiceIds, {
        forceReExtract,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: InvoiceDTOMapper.toDTOArray(result.value),
        count: result.value.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch delete invoices
   * POST /invoices/batch-delete
   */
  async batchDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceIds, force, keepFile } = req.body;

      const result = await this.deleteUseCase.executeBatch(invoiceIds, { force, keepFile });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.value,
        message: `Deleted ${result.value.deleted} invoices, ${result.value.failed} failed`,
      });
    } catch (error) {
      next(error);
    }
  }
}
