import { v4 as uuidv4 } from 'uuid';
import { VendorType } from '../value-objects/InvoiceEnums';

/**
 * Vendor Entity Properties
 */
export interface VendorProps {
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
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vendor Entity
 *
 * Represents a business vendor/supplier from whom invoices are received.
 *
 * Business Rules:
 * - Name is required and must be unique
 * - VAT number format validation (if provided)
 * - Email format validation (if provided)
 * - Can track vendor statistics (total spent, invoice count)
 */
export class Vendor {
  private readonly _id: string;
  private _name: string;
  private _vatNumber?: string;
  private _email?: string;
  private _phone?: string;
  private _address?: string;
  private _city?: string;
  private _postalCode?: string;
  private _country?: string;
  private _website?: string;
  private _vendorType: VendorType;
  private _notes?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: VendorProps) {
    this._id = props.id;
    this._name = props.name;
    this._vatNumber = props.vatNumber;
    this._email = props.email;
    this._phone = props.phone;
    this._address = props.address;
    this._city = props.city;
    this._postalCode = props.postalCode;
    this._country = props.country;
    this._website = props.website;
    this._vendorType = props.vendorType;
    this._notes = props.notes;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Vendor
   */
  public static create(
    name: string,
    vendorType: VendorType,
    options?: {
      vatNumber?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      website?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ): Vendor {
    // Validate required fields
    if (!name || name.trim().length === 0) {
      throw new Error('Vendor name is required');
    }

    if (name.trim().length < 2) {
      throw new Error('Vendor name must be at least 2 characters');
    }

    if (name.length > 200) {
      throw new Error('Vendor name cannot exceed 200 characters');
    }

    // Validate email if provided
    if (options?.email && !this.isValidEmail(options.email)) {
      throw new Error('Invalid email format');
    }

    // Validate VAT number format if provided (basic check)
    if (options?.vatNumber && !this.isValidVATNumber(options.vatNumber)) {
      throw new Error('Invalid VAT number format');
    }

    const now = new Date();
    return new Vendor({
      id: uuidv4(),
      name: name.trim(),
      vatNumber: options?.vatNumber?.trim(),
      email: options?.email?.trim().toLowerCase(),
      phone: options?.phone?.trim(),
      address: options?.address?.trim(),
      city: options?.city?.trim(),
      postalCode: options?.postalCode?.trim(),
      country: options?.country?.trim(),
      website: options?.website?.trim(),
      vendorType,
      notes: options?.notes,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Vendor from persistence
   */
  public static reconstitute(props: VendorProps): Vendor {
    return new Vendor(props);
  }

  /**
   * Update vendor information
   */
  public update(updates: {
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
  }): void {
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length < 2) {
        throw new Error('Vendor name must be at least 2 characters');
      }
      this._name = updates.name.trim();
    }

    if (updates.email !== undefined) {
      if (updates.email && !Vendor.isValidEmail(updates.email)) {
        throw new Error('Invalid email format');
      }
      this._email = updates.email?.trim().toLowerCase();
    }

    if (updates.vatNumber !== undefined) {
      if (updates.vatNumber && !Vendor.isValidVATNumber(updates.vatNumber)) {
        throw new Error('Invalid VAT number format');
      }
      this._vatNumber = updates.vatNumber?.trim();
    }

    if (updates.phone !== undefined) this._phone = updates.phone?.trim();
    if (updates.address !== undefined) this._address = updates.address?.trim();
    if (updates.city !== undefined) this._city = updates.city?.trim();
    if (updates.postalCode !== undefined) this._postalCode = updates.postalCode?.trim();
    if (updates.country !== undefined) this._country = updates.country?.trim();
    if (updates.website !== undefined) this._website = updates.website?.trim();
    if (updates.vendorType !== undefined) this._vendorType = updates.vendorType;
    if (updates.notes !== undefined) this._notes = updates.notes;

    this._updatedAt = new Date();
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
   * Get full address as string
   */
  public getFullAddress(): string | undefined {
    const parts: string[] = [];
    if (this._address) parts.push(this._address);
    if (this._postalCode && this._city) {
      parts.push(`${this._postalCode} ${this._city}`);
    } else if (this._city) {
      parts.push(this._city);
    }
    if (this._country) parts.push(this._country);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Check if vendor has complete contact information
   */
  public hasCompleteContactInfo(): boolean {
    return !!(this._email && this._phone && this._address);
  }

  /**
   * Match vendor name against a string (for fuzzy matching)
   * Returns similarity score 0-100
   */
  public matchName(searchName: string): number {
    if (!searchName) return 0;

    const vendorNameLower = this._name.toLowerCase();
    const searchNameLower = searchName.toLowerCase();

    // Exact match
    if (vendorNameLower === searchNameLower) return 100;

    // Contains match
    if (vendorNameLower.includes(searchNameLower) || searchNameLower.includes(vendorNameLower)) {
      return 80;
    }

    // Word-level matching
    const vendorWords = vendorNameLower.split(/\s+/);
    const searchWords = searchNameLower.split(/\s+/);

    const matchingWords = vendorWords.filter(vw =>
      searchWords.some(sw => vw.includes(sw) || sw.includes(vw))
    );

    if (matchingWords.length > 0) {
      return Math.floor((matchingWords.length / Math.max(vendorWords.length, searchWords.length)) * 60);
    }

    return 0;
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate VAT number format (basic check for EU VAT numbers)
   */
  private static isValidVATNumber(vatNumber: string): boolean {
    // Remove spaces and convert to uppercase
    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();

    // EU VAT number format: Country code (2 letters) + 8-12 alphanumeric characters
    const vatRegex = /^[A-Z]{2}[A-Z0-9]{8,12}$/;

    return vatRegex.test(cleaned);
  }

  // Getters
  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get vatNumber(): string | undefined { return this._vatNumber; }
  public get email(): string | undefined { return this._email; }
  public get phone(): string | undefined { return this._phone; }
  public get address(): string | undefined { return this._address; }
  public get city(): string | undefined { return this._city; }
  public get postalCode(): string | undefined { return this._postalCode; }
  public get country(): string | undefined { return this._country; }
  public get website(): string | undefined { return this._website; }
  public get vendorType(): VendorType { return this._vendorType; }
  public get notes(): string | undefined { return this._notes; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): VendorProps {
    return {
      id: this._id,
      name: this._name,
      vatNumber: this._vatNumber,
      email: this._email,
      phone: this._phone,
      address: this._address,
      city: this._city,
      postalCode: this._postalCode,
      country: this._country,
      website: this._website,
      vendorType: this._vendorType,
      notes: this._notes,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
