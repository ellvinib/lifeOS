import { FinanceInvoice as PrismaInvoice } from '@prisma/client';
import { Invoice, ExtractedInvoiceData, InvoiceLineItem } from '../../domain/entities';
import {
  InvoiceStatus,
  InvoiceSource,
  ExtractionStatus,
  TransactionCategory,
} from '../../domain/value-objects/InvoiceEnums';

/**
 * Invoice Mapper
 *
 * Maps between Prisma FinanceInvoice model and domain Invoice entity.
 * Handles type conversions, JSON parsing, and data transformations.
 */
export class InvoiceMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaInvoice): Invoice {
    return Invoice.reconstitute({
      id: prisma.id,
      vendorId: prisma.vendorId || undefined,
      invoiceNumber: prisma.invoiceNumber || undefined,
      issueDate: prisma.issueDate || undefined,
      dueDate: prisma.dueDate || undefined,
      paymentDate: prisma.paymentDate || undefined,
      subtotal: prisma.subtotal,
      vatAmount: prisma.vatAmount,
      total: prisma.total,
      currency: prisma.currency,
      status: prisma.status as InvoiceStatus,
      category: prisma.category ? (prisma.category as TransactionCategory) : undefined,
      pdfPath: prisma.pdfPath,
      source: prisma.source as InvoiceSource,
      extractionStatus: prisma.extractionStatus as ExtractionStatus,
      extractedData: prisma.extractedData
        ? (this.parseExtractedData(prisma.extractedData))
        : undefined,
      lineItems: prisma.lineItems
        ? (this.parseLineItems(prisma.lineItems))
        : undefined,
      paymentReference: prisma.paymentReference || undefined,
      notes: prisma.notes || undefined,
      tags: prisma.tags,
      metadata: (prisma.metadata as Record<string, unknown>) || undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   */
  public static toPrisma(
    invoice: Invoice
  ): Omit<PrismaInvoice, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      vendorId: invoice.vendorId || null,
      invoiceNumber: invoice.invoiceNumber || null,
      issueDate: invoice.issueDate || null,
      dueDate: invoice.dueDate || null,
      paymentDate: invoice.paymentDate || null,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      category: invoice.category || null,
      pdfPath: invoice.pdfPath,
      source: invoice.source,
      extractionStatus: invoice.extractionStatus,
      extractedData: invoice.extractedData
        ? (this.serializeExtractedData(invoice.extractedData) as any)
        : null,
      lineItems: invoice.lineItems
        ? (this.serializeLineItems(invoice.lineItems) as any)
        : null,
      paymentReference: invoice.paymentReference || null,
      notes: invoice.notes || null,
      tags: invoice.tags || [],
      metadata: (invoice.metadata as any) || {},
    };
  }

  /**
   * Convert domain entity to Prisma create data
   */
  public static toCreateData(invoice: Invoice) {
    return {
      id: invoice.id,
      ...this.toPrisma(invoice),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   */
  public static toUpdateData(invoice: Invoice) {
    return {
      ...this.toPrisma(invoice),
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Parse extracted data from JSON
   */
  private static parseExtractedData(json: any): ExtractedInvoiceData {
    return {
      invoiceNumber: json.invoiceNumber,
      issueDate: json.issueDate ? new Date(json.issueDate) : undefined,
      dueDate: json.dueDate ? new Date(json.dueDate) : undefined,
      subtotal: json.subtotal,
      vatAmount: json.vatAmount,
      total: json.total,
      currency: json.currency,
      vendorName: json.vendorName,
      vendorVatNumber: json.vendorVatNumber,
      vendorAddress: json.vendorAddress,
      vendorEmail: json.vendorEmail,
      lineItems: json.lineItems,
      paymentReference: json.paymentReference,
      iban: json.iban,
      confidence: json.confidence,
    };
  }

  /**
   * Serialize extracted data to JSON
   */
  private static serializeExtractedData(data: ExtractedInvoiceData): object {
    return {
      invoiceNumber: data.invoiceNumber,
      issueDate: data.issueDate?.toISOString(),
      dueDate: data.dueDate?.toISOString(),
      subtotal: data.subtotal,
      vatAmount: data.vatAmount,
      total: data.total,
      currency: data.currency,
      vendorName: data.vendorName,
      vendorVatNumber: data.vendorVatNumber,
      vendorAddress: data.vendorAddress,
      vendorEmail: data.vendorEmail,
      lineItems: data.lineItems,
      paymentReference: data.paymentReference,
      iban: data.iban,
      confidence: data.confidence,
    };
  }

  /**
   * Parse line items from JSON
   */
  private static parseLineItems(json: any): InvoiceLineItem[] {
    if (!Array.isArray(json)) return [];
    return json.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      vatRate: item.vatRate,
    }));
  }

  /**
   * Serialize line items to JSON
   */
  private static serializeLineItems(items: InvoiceLineItem[]): object[] {
    return items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      vatRate: item.vatRate,
    }));
  }
}
