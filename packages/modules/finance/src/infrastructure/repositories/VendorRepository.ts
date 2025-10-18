import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  IVendorRepository,
  VendorQueryOptions,
  VendorStatistics,
} from '../../domain/interfaces';
import { Vendor } from '../../domain/entities';
import { VendorType } from '../../domain/value-objects/InvoiceEnums';
import { VendorMapper } from '../mappers/VendorMapper';

/**
 * Vendor Repository Implementation with Prisma
 *
 * Implements vendor persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 */
export class VendorRepository implements IVendorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find vendor by ID
   */
  async findById(id: string): Promise<Result<Vendor, BaseError>> {
    try {
      const vendor = await this.prisma.financeVendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        return Result.fail(new NotFoundError('Vendor', id));
      }

      return Result.ok(VendorMapper.toDomain(vendor));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendor', error));
    }
  }

  /**
   * Find all vendors with optional filters
   */
  async findAll(options?: VendorQueryOptions): Promise<Result<Vendor[], BaseError>> {
    try {
      const where: any = {};

      if (options?.vendorType) {
        where.vendorType = options.vendorType;
      }

      if (options?.country) {
        where.country = options.country;
      }

      if (options?.searchTerm) {
        where.OR = [
          { name: { contains: options.searchTerm, mode: 'insensitive' } },
          { email: { contains: options.searchTerm, mode: 'insensitive' } },
          { vatNumber: { contains: options.searchTerm, mode: 'insensitive' } },
        ];
      }

      const skip =
        options?.page && options?.limit ? (options.page - 1) * options.limit : undefined;

      const orderBy: any = {};
      if (options?.sortBy) {
        orderBy[options.sortBy] = options.sortOrder || 'asc';
      } else {
        orderBy.name = 'asc'; // Default sort
      }

      const vendors = await this.prisma.financeVendor.findMany({
        where,
        orderBy,
        take: options?.limit,
        skip,
      });

      return Result.ok(vendors.map(VendorMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendors', error));
    }
  }

  /**
   * Find vendor by name (exact match)
   */
  async findByName(name: string): Promise<Result<Vendor, BaseError>> {
    try {
      const vendor = await this.prisma.financeVendor.findUnique({
        where: { name },
      });

      if (!vendor) {
        return Result.fail(new NotFoundError('Vendor', `name: ${name}`));
      }

      return Result.ok(VendorMapper.toDomain(vendor));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendor by name', error));
    }
  }

  /**
   * Find vendors by name (partial match)
   */
  async findByNameLike(namePart: string): Promise<Result<Vendor[], BaseError>> {
    try {
      const vendors = await this.prisma.financeVendor.findMany({
        where: {
          name: {
            contains: namePart,
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });

      return Result.ok(vendors.map(VendorMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to search vendors by name', error));
    }
  }

  /**
   * Find vendor by VAT number
   */
  async findByVATNumber(vatNumber: string): Promise<Result<Vendor, BaseError>> {
    try {
      const vendor = await this.prisma.financeVendor.findFirst({
        where: { vatNumber },
      });

      if (!vendor) {
        return Result.fail(new NotFoundError('Vendor', `VAT: ${vatNumber}`));
      }

      return Result.ok(VendorMapper.toDomain(vendor));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendor by VAT number', error));
    }
  }

  /**
   * Find vendor by email
   */
  async findByEmail(email: string): Promise<Result<Vendor, BaseError>> {
    try {
      const vendor = await this.prisma.financeVendor.findFirst({
        where: { email },
      });

      if (!vendor) {
        return Result.fail(new NotFoundError('Vendor', `email: ${email}`));
      }

      return Result.ok(VendorMapper.toDomain(vendor));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendor by email', error));
    }
  }

  /**
   * Find vendors by type
   */
  async findByType(vendorType: VendorType): Promise<Result<Vendor[], BaseError>> {
    try {
      const vendors = await this.prisma.financeVendor.findMany({
        where: { vendorType },
        orderBy: { name: 'asc' },
      });

      return Result.ok(vendors.map(VendorMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendors by type', error));
    }
  }

  /**
   * Find vendors by country
   */
  async findByCountry(country: string): Promise<Result<Vendor[], BaseError>> {
    try {
      const vendors = await this.prisma.financeVendor.findMany({
        where: { country },
        orderBy: { name: 'asc' },
      });

      return Result.ok(vendors.map(VendorMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find vendors by country', error));
    }
  }

  /**
   * Search vendors by text
   */
  async search(searchTerm: string): Promise<Result<Vendor[], BaseError>> {
    return this.findAll({ searchTerm });
  }

  /**
   * Find vendors with incomplete contact info
   */
  async findWithIncompleteInfo(): Promise<Result<Vendor[], BaseError>> {
    try {
      const vendors = await this.prisma.financeVendor.findMany({
        where: {
          OR: [
            { email: null },
            { phone: null },
            { address: null },
          ],
        },
        orderBy: { name: 'asc' },
      });

      return Result.ok(vendors.map(VendorMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find vendors with incomplete info', error)
      );
    }
  }

  /**
   * Find or create vendor by name (upsert logic)
   */
  async findOrCreate(name: string, vendorType: VendorType): Promise<Result<Vendor, BaseError>> {
    try {
      // Try to find existing vendor
      const existing = await this.prisma.financeVendor.findUnique({
        where: { name },
      });

      if (existing) {
        return Result.ok(VendorMapper.toDomain(existing));
      }

      // Create new vendor
      const vendor = Vendor.create(name, vendorType);
      const created = await this.prisma.financeVendor.create({
        data: VendorMapper.toCreateData(vendor),
      });

      return Result.ok(VendorMapper.toDomain(created));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find or create vendor', error));
    }
  }

  /**
   * Create a new vendor
   */
  async create(vendor: Vendor): Promise<Result<Vendor, BaseError>> {
    try {
      const created = await this.prisma.financeVendor.create({
        data: VendorMapper.toCreateData(vendor),
      });

      return Result.ok(VendorMapper.toDomain(created));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to create vendor', error));
    }
  }

  /**
   * Update an existing vendor
   */
  async update(vendor: Vendor): Promise<Result<Vendor, BaseError>> {
    try {
      const updated = await this.prisma.financeVendor.update({
        where: { id: vendor.id },
        data: VendorMapper.toUpdateData(vendor),
      });

      return Result.ok(VendorMapper.toDomain(updated));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to update vendor', error));
    }
  }

  /**
   * Delete a vendor
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.financeVendor.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete vendor', error));
    }
  }

  /**
   * Get vendor statistics
   */
  async getStatistics(vendorId: string): Promise<Result<VendorStatistics, BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: { vendorId },
      });

      const totalSpent = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const invoiceCount = invoices.length;
      const averageInvoiceAmount = invoiceCount > 0 ? totalSpent / invoiceCount : 0;

      const lastInvoice = invoices.sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      )[0];
      const lastInvoiceDate = lastInvoice?.createdAt;

      const pendingAmount = invoices
        .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.total, 0);

      const paidAmount = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

      return Result.ok({
        totalSpent,
        invoiceCount,
        averageInvoiceAmount,
        lastInvoiceDate,
        pendingAmount,
        paidAmount,
      });
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get vendor statistics', error));
    }
  }

  /**
   * Get top vendors by spending
   */
  async getTopVendorsBySpending(
    limit: number = 10
  ): Promise<
    Result<
      Array<{
        vendor: Vendor;
        totalSpent: number;
        invoiceCount: number;
      }>,
      BaseError
    >
  > {
    try {
      const vendors = await this.prisma.financeVendor.findMany({
        include: {
          invoices: {
            where: {
              status: {
                in: ['paid', 'pending', 'overdue'],
              },
            },
          },
        },
      });

      const vendorStats = vendors.map(v => ({
        vendor: VendorMapper.toDomain(v),
        totalSpent: v.invoices.reduce((sum, inv) => sum + inv.total, 0),
        invoiceCount: v.invoices.length,
      }));

      // Sort by totalSpent descending
      vendorStats.sort((a, b) => b.totalSpent - a.totalSpent);

      return Result.ok(vendorStats.slice(0, limit));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get top vendors', error));
    }
  }

  /**
   * Count vendors matching criteria
   */
  async count(options?: VendorQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.vendorType) {
        where.vendorType = options.vendorType;
      }

      if (options?.country) {
        where.country = options.country;
      }

      if (options?.searchTerm) {
        where.OR = [
          { name: { contains: options.searchTerm, mode: 'insensitive' } },
          { email: { contains: options.searchTerm, mode: 'insensitive' } },
          { vatNumber: { contains: options.searchTerm, mode: 'insensitive' } },
        ];
      }

      const count = await this.prisma.financeVendor.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to count vendors', error));
    }
  }

  /**
   * Check if vendor name exists
   */
  async existsByName(name: string): Promise<Result<boolean, BaseError>> {
    try {
      const vendor = await this.prisma.financeVendor.findUnique({
        where: { name },
        select: { id: true },
      });

      return Result.ok(vendor !== null);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to check vendor name existence', error));
    }
  }

  /**
   * Check if VAT number exists
   */
  async existsByVATNumber(vatNumber: string): Promise<Result<boolean, BaseError>> {
    try {
      const vendor = await this.prisma.financeVendor.findFirst({
        where: { vatNumber },
        select: { id: true },
      });

      return Result.ok(vendor !== null);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to check VAT number existence', error));
    }
  }
}
