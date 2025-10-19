import { v4 as uuidv4 } from 'uuid';
import { Money } from '../value-objects/Money';
import {
  InvoiceStatus,
  InvoiceSource,
  ExtractionStatus,
  TransactionCategory,
} from '../value-objects/InvoiceEnums';

/**
 * Invoice Line Item
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate?: number;
}

/**
 * Extracted Invoice Data from AI
 */
export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  issueDate?: Date;
  dueDate?: Date;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  currency?: string;
  vendorName?: string;
  vendorVatNumber?: string;
  vendorAddress?: string;
  vendorEmail?: string;
  lineItems?: InvoiceLineItem[];
  paymentReference?: string;
  iban?: string;
  confidence?: number; // 0-100 confidence score from AI
}

/**
 * Invoice Entity Properties
 */
export interface InvoiceProps {
  id: string;
  vendorId?: string; // Linked vendor (optional until matched)
  invoiceNumber?: string;
  issueDate?: Date;
  dueDate?: Date;
  paymentDate?: Date;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  category?: TransactionCategory;
  pdfPath: string; // Path to stored PDF file
  source: InvoiceSource;
  extractionStatus: ExtractionStatus;
  extractedData?: ExtractedInvoiceData;
  lineItems?: InvoiceLineItem[];
  paymentReference?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice Entity
 *
 * Represents a vendor invoice received via email or manual upload.
 * Central entity for invoice management and reconciliation.
 *
 * Business Rules:
 * - Total must equal subtotal + VAT amount
 * - Due date must be after or equal to issue date
 * - Payment date must be after issue date
 * - Paid invoices cannot be modified
 * - Invoice number should be unique per vendor
 * - Overdue status automatically set when due date passes
 */
export class Invoice {
  private readonly _id: string;
  private _vendorId?: string;
  private _invoiceNumber?: string;
  private _issueDate?: Date;
  private _dueDate?: Date;
  private _paymentDate?: Date;
  private _subtotal: number;
  private _vatAmount: number;
  private _total: number;
  private _currency: string;
  private _status: InvoiceStatus;
  private _category?: TransactionCategory;
  private readonly _pdfPath: string;
  private readonly _source: InvoiceSource;
  private _extractionStatus: ExtractionStatus;
  private _extractedData?: ExtractedInvoiceData;
  private _lineItems?: InvoiceLineItem[];
  private _paymentReference?: string;
  private _notes?: string;
  private _tags?: string[];
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InvoiceProps) {
    this._id = props.id;
    this._vendorId = props.vendorId;
    this._invoiceNumber = props.invoiceNumber;
    this._issueDate = props.issueDate;
    this._dueDate = props.dueDate;
    this._paymentDate = props.paymentDate;
    this._subtotal = props.subtotal;
    this._vatAmount = props.vatAmount;
    this._total = props.total;
    this._currency = props.currency;
    this._status = props.status;
    this._category = props.category;
    this._pdfPath = props.pdfPath;
    this._source = props.source;
    this._extractionStatus = props.extractionStatus;
    this._extractedData = props.extractedData;
    this._lineItems = props.lineItems;
    this._paymentReference = props.paymentReference;
    this._notes = props.notes;
    this._tags = props.tags;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Invoice (before AI extraction)
   */
  public static create(
    pdfPath: string,
    source: InvoiceSource,
    currency: string = 'EUR'
  ): Invoice {
    if (!pdfPath || pdfPath.trim().length === 0) {
      throw new Error('PDF path is required');
    }

    const now = new Date();
    return new Invoice({
      id: uuidv4(),
      pdfPath: pdfPath.trim(),
      source,
      currency,
      subtotal: 0,
      vatAmount: 0,
      total: 0,
      status: InvoiceStatus.DRAFT,
      extractionStatus: ExtractionStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Invoice from persistence
   */
  public static reconstitute(props: InvoiceProps): Invoice {
    return new Invoice(props);
  }

  /**
   * Apply extracted data from AI
   */
  public applyExtractedData(extractedData: ExtractedInvoiceData): void {
    if (this._extractionStatus === ExtractionStatus.COMPLETED) {
      throw new Error('Extraction already completed');
    }

    this._extractedData = extractedData;

    // Apply extracted fields if available and valid
    if (extractedData.invoiceNumber) {
      this._invoiceNumber = extractedData.invoiceNumber.trim();
    }

    if (extractedData.issueDate) {
      this._issueDate = extractedData.issueDate;
    }

    if (extractedData.dueDate) {
      this._dueDate = extractedData.dueDate;
      // Validate due date is after issue date
      if (this._issueDate && this._dueDate < this._issueDate) {
        throw new Error('Due date cannot be before issue date');
      }
    }

    if (extractedData.subtotal !== undefined) {
      this._subtotal = extractedData.subtotal;
    }

    if (extractedData.vatAmount !== undefined) {
      this._vatAmount = extractedData.vatAmount;
    }

    if (extractedData.total !== undefined) {
      this._total = extractedData.total;

      // Validate total = subtotal + VAT (with small tolerance for rounding)
      const expectedTotal = this._subtotal + this._vatAmount;
      const diff = Math.abs(this._total - expectedTotal);
      if (diff > 0.02) {
        // Tolerance of 2 cents
        throw new Error(
          `Total (${this._total}) does not match subtotal (${this._subtotal}) + VAT (${this._vatAmount})`
        );
      }
    }

    if (extractedData.currency) {
      this._currency = extractedData.currency;
    }

    if (extractedData.lineItems && extractedData.lineItems.length > 0) {
      this._lineItems = extractedData.lineItems;
    }

    if (extractedData.paymentReference) {
      this._paymentReference = extractedData.paymentReference;
    }

    // Update status
    this._extractionStatus = ExtractionStatus.COMPLETED;
    if (this._status === InvoiceStatus.DRAFT) {
      this._status = InvoiceStatus.PENDING;
    }

    this._updatedAt = new Date();
  }

  /**
   * Mark extraction as failed
   */
  public markExtractionFailed(error: string): void {
    this._extractionStatus = ExtractionStatus.FAILED;
    this.addMetadata('extraction_error', error);
    this._updatedAt = new Date();
  }

  /**
   * Manually update invoice data (if extraction failed or needs correction)
   */
  public updateInvoiceData(updates: {
    vendorId?: string;
    invoiceNumber?: string;
    issueDate?: Date;
    dueDate?: Date;
    subtotal?: number;
    vatAmount?: number;
    total?: number;
    currency?: string;
    category?: TransactionCategory;
    paymentReference?: string;
    notes?: string;
  }): void {
    if (this._status === InvoiceStatus.PAID) {
      throw new Error('Cannot update paid invoice');
    }

    if (this._status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot update cancelled invoice');
    }

    if (updates.vendorId !== undefined) this._vendorId = updates.vendorId;
    if (updates.invoiceNumber !== undefined) this._invoiceNumber = updates.invoiceNumber;
    if (updates.issueDate !== undefined) this._issueDate = updates.issueDate;
    if (updates.dueDate !== undefined) {
      this._dueDate = updates.dueDate;
      // Validate due date
      if (this._issueDate && this._dueDate < this._issueDate) {
        throw new Error('Due date cannot be before issue date');
      }
    }
    if (updates.subtotal !== undefined) this._subtotal = updates.subtotal;
    if (updates.vatAmount !== undefined) this._vatAmount = updates.vatAmount;
    if (updates.total !== undefined) {
      this._total = updates.total;
      // Validate total
      const expectedTotal = this._subtotal + this._vatAmount;
      const diff = Math.abs(this._total - expectedTotal);
      if (diff > 0.02) {
        throw new Error('Total must equal subtotal + VAT amount');
      }
    }
    if (updates.currency !== undefined) this._currency = updates.currency;
    if (updates.category !== undefined) this._category = updates.category;
    if (updates.paymentReference !== undefined) this._paymentReference = updates.paymentReference;
    if (updates.notes !== undefined) this._notes = updates.notes;

    // Mark extraction as manual if data was manually entered
    if (this._extractionStatus === ExtractionStatus.PENDING ||
        this._extractionStatus === ExtractionStatus.FAILED) {
      this._extractionStatus = ExtractionStatus.MANUAL;
      if (this._status === InvoiceStatus.DRAFT) {
        this._status = InvoiceStatus.PENDING;
      }
    }

    this._updatedAt = new Date();
  }

  /**
   * Mark invoice as paid
   */
  public markAsPaid(paymentDate: Date): void {
    if (this._status === InvoiceStatus.PAID) {
      throw new Error('Invoice is already marked as paid');
    }

    if (this._status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot pay a cancelled invoice');
    }

    if (this._issueDate && paymentDate < this._issueDate) {
      throw new Error('Payment date cannot be before issue date');
    }

    this._status = InvoiceStatus.PAID;
    this._paymentDate = paymentDate;
    this._updatedAt = new Date();
  }

  /**
   * Mark invoice as overdue (typically called by scheduled job)
   */
  public markAsOverdue(): void {
    if (this._status === InvoiceStatus.PAID || this._status === InvoiceStatus.CANCELLED) {
      throw new Error(`Cannot mark ${this._status} invoice as overdue`);
    }

    if (!this._dueDate) {
      throw new Error('Cannot mark invoice without due date as overdue');
    }

    this._status = InvoiceStatus.OVERDUE;
    this._updatedAt = new Date();
  }

  /**
   * Cancel the invoice
   */
  public cancel(reason?: string): void {
    if (this._status === InvoiceStatus.PAID) {
      throw new Error('Cannot cancel a paid invoice');
    }

    this._status = InvoiceStatus.CANCELLED;
    if (reason) {
      this.addMetadata('cancellation_reason', reason);
    }
    this._updatedAt = new Date();
  }

  /**
   * Add or update tags
   */
  public addTag(tag: string): void {
    if (!this._tags) {
      this._tags = [];
    }
    const tagLower = tag.toLowerCase().trim();
    if (!this._tags.includes(tagLower)) {
      this._tags.push(tagLower);
      this._updatedAt = new Date();
    }
  }

  /**
   * Remove tag
   */
  public removeTag(tag: string): void {
    if (this._tags) {
      const tagLower = tag.toLowerCase().trim();
      this._tags = this._tags.filter(t => t !== tagLower);
      this._updatedAt = new Date();
    }
  }

  /**
   * Add metadata
   */
  public addMetadata(key: string, value: unknown): void {
    if (!this._metadata) {
      this._metadata = {};
    }
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  /**
   * Check if invoice is overdue
   */
  public isOverdue(): boolean {
    if (this._status === InvoiceStatus.PAID || this._status === InvoiceStatus.CANCELLED) {
      return false;
    }
    if (!this._dueDate) return false;
    return new Date() > this._dueDate;
  }

  /**
   * Check if invoice is paid
   */
  public isPaid(): boolean {
    return this._status === InvoiceStatus.PAID;
  }

  /**
   * Check if invoice is due soon (within specified days)
   */
  public isDueSoon(days: number = 7): boolean {
    if (this._status !== InvoiceStatus.PENDING) return false;
    if (!this._dueDate) return false;

    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + days);
    return this._dueDate <= daysFromNow && this._dueDate >= new Date();
  }

  /**
   * Get days until due (negative if overdue)
   */
  public getDaysUntilDue(): number | undefined {
    if (!this._dueDate) return undefined;
    const now = new Date();
    const diffTime = this._dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate match score with a bank transaction
   * Used for intelligent matching algorithm
   */
  public calculateMatchScore(
    transactionAmount: number,
    transactionDate: Date,
    transactionDescription?: string,
    transactionCounterparty?: string
  ): number {
    let score = 0;

    // Amount match (exact or with small tolerance) - 50 points
    const invoiceAmount = Math.abs(this._total);
    const txAmount = Math.abs(transactionAmount);
    const amountDiff = Math.abs(invoiceAmount - txAmount);

    if (amountDiff === 0) {
      score += 50;
    } else if (amountDiff <= 0.10) {
      score += 45;
    } else if (amountDiff <= 1.00) {
      score += 35;
    } else if (amountDiff <= 5.00) {
      score += 20;
    } else if (amountDiff / invoiceAmount <= 0.05) {
      // Within 5%
      score += 10;
    }

    // Date match (±7 days from due date or issue date) - 20 points
    const referenceDate = this._dueDate || this._issueDate;
    if (referenceDate) {
      const daysDiff = Math.abs(
        (transactionDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 0) {
        score += 20;
      } else if (daysDiff <= 2) {
        score += 15;
      } else if (daysDiff <= 7) {
        score += 10;
      } else if (daysDiff <= 14) {
        score += 5;
      }
    }

    // Invoice number in transaction description - 30 points
    if (this._invoiceNumber && transactionDescription) {
      const invoiceNumPattern = this._invoiceNumber.replace(/[^a-zA-Z0-9]/g, '');
      const descriptionPattern = transactionDescription.replace(/[^a-zA-Z0-9]/g, '');
      if (descriptionPattern.includes(invoiceNumPattern)) {
        score += 30;
      }
    }

    // Vendor name matching (if we have vendor info and counterparty) - 25 points (handled in use case layer)

    // Payment reference match - bonus points
    if (this._paymentReference && transactionDescription) {
      if (transactionDescription.includes(this._paymentReference)) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check if invoice can be matched to a transaction
   */
  public canMatchToTransaction(): boolean {
    // Can only match pending or overdue invoices
    return this._status === InvoiceStatus.PENDING || this._status === InvoiceStatus.OVERDUE;
  }

  /**
   * Get total as Money value object
   */
  public getTotalMoney(): Money {
    return Money.fromDecimal(this._total, this._currency);
  }

  /**
   * Get subtotal as Money value object
   */
  public getSubtotalMoney(): Money {
    return Money.fromDecimal(this._subtotal, this._currency);
  }

  /**
   * Get VAT amount as Money value object
   */
  public getVATMoney(): Money {
    return Money.fromDecimal(this._vatAmount, this._currency);
  }

  // Getters
  public get id(): string { return this._id; }
  public get vendorId(): string | undefined { return this._vendorId; }
  public get invoiceNumber(): string | undefined { return this._invoiceNumber; }
  public get issueDate(): Date | undefined { return this._issueDate; }
  public get dueDate(): Date | undefined { return this._dueDate; }
  public get paymentDate(): Date | undefined { return this._paymentDate; }
  public get subtotal(): number { return this._subtotal; }
  public get vatAmount(): number { return this._vatAmount; }
  public get total(): number { return this._total; }
  public get currency(): string { return this._currency; }
  public get status(): InvoiceStatus { return this._status; }
  public get category(): TransactionCategory | undefined { return this._category; }
  public get pdfPath(): string { return this._pdfPath; }
  public get source(): InvoiceSource { return this._source; }
  public get extractionStatus(): ExtractionStatus { return this._extractionStatus; }
  public get extractedData(): ExtractedInvoiceData | undefined { return this._extractedData; }
  public get lineItems(): InvoiceLineItem[] | undefined { return this._lineItems; }
  public get paymentReference(): string | undefined { return this._paymentReference; }
  public get notes(): string | undefined { return this._notes; }
  public get tags(): string[] | undefined { return this._tags; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): InvoiceProps {
    return {
      id: this._id,
      vendorId: this._vendorId,
      invoiceNumber: this._invoiceNumber,
      issueDate: this._issueDate,
      dueDate: this._dueDate,
      paymentDate: this._paymentDate,
      subtotal: this._subtotal,
      vatAmount: this._vatAmount,
      total: this._total,
      currency: this._currency,
      status: this._status,
      category: this._category,
      pdfPath: this._pdfPath,
      source: this._source,
      extractionStatus: this._extractionStatus,
      extractedData: this._extractedData,
      lineItems: this._lineItems,
      paymentReference: this._paymentReference,
      notes: this._notes,
      tags: this._tags,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
