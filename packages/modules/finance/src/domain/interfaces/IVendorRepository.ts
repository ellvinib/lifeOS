import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Vendor } from '../entities';
import { VendorType } from '../value-objects/InvoiceEnums';

/**
 * Vendor query options
 */
export interface VendorQueryOptions {
  vendorType?: VendorType;
  country?: string;
  searchTerm?: string; // Search in name, email, vat number
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Vendor statistics
 */
export interface VendorStatistics {
  totalSpent: number;
  invoiceCount: number;
  averageInvoiceAmount: number;
  lastInvoiceDate?: Date;
  pendingAmount: number;
  paidAmount: number;
}

/**
 * Vendor Repository Interface
 */
export interface IVendorRepository {
  /**
   * Find vendor by ID
   */
  findById(id: string): Promise<Result<Vendor, BaseError>>;

  /**
   * Find all vendors with optional filters
   */
  findAll(options?: VendorQueryOptions): Promise<Result<Vendor[], BaseError>>;

  /**
   * Find vendor by name (exact match)
   */
  findByName(name: string): Promise<Result<Vendor, BaseError>>;

  /**
   * Find vendors by name (partial match)
   */
  findByNameLike(namePart: string): Promise<Result<Vendor[], BaseError>>;

  /**
   * Find vendor by VAT number
   */
  findByVATNumber(vatNumber: string): Promise<Result<Vendor, BaseError>>;

  /**
   * Find vendor by email
   */
  findByEmail(email: string): Promise<Result<Vendor, BaseError>>;

  /**
   * Find vendors by type
   */
  findByType(vendorType: VendorType): Promise<Result<Vendor[], BaseError>>;

  /**
   * Find vendors by country
   */
  findByCountry(country: string): Promise<Result<Vendor[], BaseError>>;

  /**
   * Search vendors by text (name, email, VAT number)
   */
  search(searchTerm: string): Promise<Result<Vendor[], BaseError>>;

  /**
   * Find vendors with incomplete contact info
   */
  findWithIncompleteInfo(): Promise<Result<Vendor[], BaseError>>;

  /**
   * Find or create vendor by name (upsert logic)
   */
  findOrCreate(name: string, vendorType: VendorType): Promise<Result<Vendor, BaseError>>;

  /**
   * Create a new vendor
   */
  create(vendor: Vendor): Promise<Result<Vendor, BaseError>>;

  /**
   * Update an existing vendor
   */
  update(vendor: Vendor): Promise<Result<Vendor, BaseError>>;

  /**
   * Delete a vendor
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get vendor statistics (total spent, invoice count, etc.)
   */
  getStatistics(vendorId: string): Promise<Result<VendorStatistics, BaseError>>;

  /**
   * Get top vendors by spending
   */
  getTopVendorsBySpending(limit?: number): Promise<Result<Array<{
    vendor: Vendor;
    totalSpent: number;
    invoiceCount: number;
  }>, BaseError>>;

  /**
   * Count vendors matching criteria
   */
  count(options?: VendorQueryOptions): Promise<Result<number, BaseError>>;

  /**
   * Check if vendor name exists
   */
  existsByName(name: string): Promise<Result<boolean, BaseError>>;

  /**
   * Check if VAT number exists
   */
  existsByVATNumber(vatNumber: string): Promise<Result<boolean, BaseError>>;
}
