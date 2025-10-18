import { FinanceVendor as PrismaVendor } from '@prisma/client';
import { Vendor } from '../../domain/entities';
import { VendorType } from '../../domain/value-objects/InvoiceEnums';

/**
 * Vendor Mapper
 *
 * Maps between Prisma FinanceVendor model and domain Vendor entity.
 * Handles type conversions and data transformations.
 */
export class VendorMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaVendor): Vendor {
    return Vendor.reconstitute({
      id: prisma.id,
      name: prisma.name,
      vatNumber: prisma.vatNumber || undefined,
      email: prisma.email || undefined,
      phone: prisma.phone || undefined,
      address: prisma.address || undefined,
      city: prisma.city || undefined,
      postalCode: prisma.postalCode || undefined,
      country: prisma.country || undefined,
      website: prisma.website || undefined,
      vendorType: prisma.vendorType as VendorType,
      notes: prisma.notes || undefined,
      metadata: (prisma.metadata as Record<string, unknown>) || undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   */
  public static toPrisma(vendor: Vendor): Omit<PrismaVendor, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: vendor.name,
      vatNumber: vendor.vatNumber || null,
      email: vendor.email || null,
      phone: vendor.phone || null,
      address: vendor.address || null,
      city: vendor.city || null,
      postalCode: vendor.postalCode || null,
      country: vendor.country || null,
      website: vendor.website || null,
      vendorType: vendor.vendorType,
      notes: vendor.notes || null,
      metadata: (vendor.metadata as any) || {},
    };
  }

  /**
   * Convert domain entity to Prisma create data
   */
  public static toCreateData(vendor: Vendor) {
    return {
      id: vendor.id,
      ...this.toPrisma(vendor),
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   */
  public static toUpdateData(vendor: Vendor) {
    return {
      ...this.toPrisma(vendor),
      updatedAt: vendor.updatedAt,
    };
  }
}
