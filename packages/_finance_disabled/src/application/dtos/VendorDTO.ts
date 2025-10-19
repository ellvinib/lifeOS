import { Vendor, VendorType } from '../../domain/entities';

/**
 * Vendor DTO (Data Transfer Object)
 *
 * Represents vendor data for API responses.
 */
export interface VendorDTO {
  id: string;
  name: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  vendorType: VendorType;
  notes?: string;
  tags?: string[];
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string;
}

/**
 * Create Vendor DTO
 */
export interface CreateVendorDTO {
  name: string;
  vendorType: VendorType;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Update Vendor DTO
 */
export interface UpdateVendorDTO {
  name?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  vendorType?: VendorType;
  notes?: string;
  tags?: string[];
}

/**
 * Vendor Statistics DTO
 */
export interface VendorStatisticsDTO {
  vendorId: string;
  vendorName: string;
  totalSpent: number;
  invoiceCount: number;
  averageInvoiceAmount: number;
  lastInvoiceDate?: string; // ISO 8601 date string
  pendingAmount: number;
  paidAmount: number;
  currency: string;
}

/**
 * Vendor List DTO
 */
export interface VendorListDTO {
  vendors: VendorDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Vendor Filter DTO
 */
export interface VendorFilterDTO {
  vendorType?: VendorType;
  country?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Vendor DTO Mapper
 */
export class VendorDTOMapper {
  /**
   * Map domain entity to DTO
   */
  public static toDTO(vendor: Vendor): VendorDTO {
    return {
      id: vendor.id,
      name: vendor.name,
      vatNumber: vendor.vatNumber,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      postalCode: vendor.postalCode,
      country: vendor.country,
      website: vendor.website,
      vendorType: vendor.vendorType,
      notes: vendor.notes,
      tags: vendor.tags,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  /**
   * Map array of domain entities to DTOs
   */
  public static toDTOArray(vendors: Vendor[]): VendorDTO[] {
    return vendors.map((vendor) => this.toDTO(vendor));
  }

  /**
   * Create paginated list DTO
   */
  public static toListDTO(
    vendors: Vendor[],
    page: number,
    limit: number,
    total: number
  ): VendorListDTO {
    return {
      vendors: this.toDTOArray(vendors),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Map CreateVendorDTO to domain entity
   */
  public static fromCreateDTO(dto: CreateVendorDTO): Vendor {
    const vendor = Vendor.create(dto.name, dto.vendorType);

    if (dto.vatNumber) vendor.setVATNumber(dto.vatNumber);
    if (dto.email) vendor.setEmail(dto.email);
    if (dto.phone) vendor.setPhone(dto.phone);
    if (dto.address) vendor.setAddress(dto.address);
    if (dto.city) vendor.setCity(dto.city);
    if (dto.postalCode) vendor.setPostalCode(dto.postalCode);
    if (dto.country) vendor.setCountry(dto.country);
    if (dto.website) vendor.setWebsite(dto.website);
    if (dto.notes) vendor.updateNotes(dto.notes);
    if (dto.tags) vendor.setTags(dto.tags);

    return vendor;
  }

  /**
   * Map UpdateVendorDTO to domain update parameters
   */
  public static fromUpdateDTO(dto: UpdateVendorDTO) {
    return dto;
  }

  /**
   * Map VendorFilterDTO to domain query options
   */
  public static fromFilterDTO(dto: VendorFilterDTO) {
    return {
      vendorType: dto.vendorType,
      country: dto.country,
      searchTerm: dto.searchTerm,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }
}
