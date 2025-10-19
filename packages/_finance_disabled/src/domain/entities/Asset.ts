import { v4 as uuidv4 } from 'uuid';

/**
 * Asset Types
 */
export type AssetType =
  | 'cash'
  | 'savings'
  | 'checking'
  | 'investment'
  | 'retirement'
  | 'real_estate'
  | 'vehicle'
  | 'other';

/**
 * Asset Entity Properties
 */
export interface AssetProps {
  id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: Date;
  institution?: string;
  accountNumber?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Asset Entity
 *
 * Represents a financial asset for net worth tracking.
 * Can be liquid (cash, savings) or non-liquid (real estate, vehicle).
 *
 * Business Rules:
 * - Current value must be non-negative
 * - Purchase value (if provided) must be positive
 * - Purchase date must be in the past
 */
export class Asset {
  private readonly _id: string;
  private _name: string;
  private readonly _type: AssetType;
  private _currentValue: number;
  private _purchaseValue?: number;
  private _purchaseDate?: Date;
  private _institution?: string;
  private _accountNumber?: string;
  private _notes?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AssetProps) {
    this._id = props.id;
    this._name = props.name;
    this._type = props.type;
    this._currentValue = props.currentValue;
    this._purchaseValue = props.purchaseValue;
    this._purchaseDate = props.purchaseDate;
    this._institution = props.institution;
    this._accountNumber = props.accountNumber;
    this._notes = props.notes;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Asset
   */
  public static create(
    name: string,
    type: AssetType,
    currentValue: number,
    options?: {
      purchaseValue?: number;
      purchaseDate?: Date;
      institution?: string;
      accountNumber?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ): Asset {
    if (currentValue < 0) {
      throw new Error('Asset current value cannot be negative');
    }

    if (options?.purchaseValue !== undefined && options.purchaseValue <= 0) {
      throw new Error('Asset purchase value must be positive');
    }

    if (options?.purchaseDate && options.purchaseDate > new Date()) {
      throw new Error('Purchase date cannot be in the future');
    }

    const now = new Date();
    return new Asset({
      id: uuidv4(),
      name,
      type,
      currentValue,
      purchaseValue: options?.purchaseValue,
      purchaseDate: options?.purchaseDate,
      institution: options?.institution,
      accountNumber: options?.accountNumber,
      notes: options?.notes,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Asset from persistence
   */
  public static reconstitute(props: AssetProps): Asset {
    return new Asset(props);
  }

  /**
   * Update asset value (e.g., market value changes)
   */
  public updateValue(newValue: number): void {
    if (newValue < 0) {
      throw new Error('Asset value cannot be negative');
    }

    this._currentValue = newValue;
    this._updatedAt = new Date();
  }

  /**
   * Update asset details
   */
  public update(updates: {
    name?: string;
    currentValue?: number;
    institution?: string;
    accountNumber?: string;
    notes?: string;
  }): void {
    if (updates.currentValue !== undefined && updates.currentValue < 0) {
      throw new Error('Asset current value cannot be negative');
    }

    if (updates.name !== undefined) this._name = updates.name;
    if (updates.currentValue !== undefined) this._currentValue = updates.currentValue;
    if (updates.institution !== undefined) this._institution = updates.institution;
    if (updates.accountNumber !== undefined) this._accountNumber = updates.accountNumber;
    if (updates.notes !== undefined) this._notes = updates.notes;

    this._updatedAt = new Date();
  }

  /**
   * Calculate appreciation/depreciation
   */
  public getAppreciation(): number | null {
    if (!this._purchaseValue) return null;
    return this._currentValue - this._purchaseValue;
  }

  /**
   * Calculate appreciation/depreciation percentage
   */
  public getAppreciationPercentage(): number | null {
    if (!this._purchaseValue || this._purchaseValue === 0) return null;
    return ((this._currentValue - this._purchaseValue) / this._purchaseValue) * 100;
  }

  /**
   * Check if asset has appreciated
   */
  public hasAppreciated(): boolean | null {
    const appreciation = this.getAppreciation();
    return appreciation !== null ? appreciation > 0 : null;
  }

  /**
   * Check if asset has depreciated
   */
  public hasDepreciated(): boolean | null {
    const appreciation = this.getAppreciation();
    return appreciation !== null ? appreciation < 0 : null;
  }

  /**
   * Check if asset is liquid (can be quickly converted to cash)
   */
  public isLiquid(): boolean {
    return ['cash', 'savings', 'checking'].includes(this._type);
  }

  /**
   * Check if asset is an investment account
   */
  public isInvestment(): boolean {
    return ['investment', 'retirement'].includes(this._type);
  }

  /**
   * Check if asset is tangible
   */
  public isTangible(): boolean {
    return ['real_estate', 'vehicle'].includes(this._type);
  }

  /**
   * Calculate holding period in years
   */
  public getHoldingPeriodYears(): number | null {
    if (!this._purchaseDate) return null;
    const now = new Date();
    const diffMs = now.getTime() - this._purchaseDate.getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 365.25);
  }

  /**
   * Calculate annualized return
   */
  public getAnnualizedReturn(): number | null {
    const appreciation = this.getAppreciationPercentage();
    const years = this.getHoldingPeriodYears();

    if (appreciation === null || years === null || years === 0) return null;

    // Simple annualization: (total return / years)
    return appreciation / years;
  }

  // Getters
  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get type(): AssetType { return this._type; }
  public get currentValue(): number { return this._currentValue; }
  public get purchaseValue(): number | undefined { return this._purchaseValue; }
  public get purchaseDate(): Date | undefined { return this._purchaseDate; }
  public get institution(): string | undefined { return this._institution; }
  public get accountNumber(): string | undefined { return this._accountNumber; }
  public get notes(): string | undefined { return this._notes; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): AssetProps {
    return {
      id: this._id,
      name: this._name,
      type: this._type,
      currentValue: this._currentValue,
      purchaseValue: this._purchaseValue,
      purchaseDate: this._purchaseDate,
      institution: this._institution,
      accountNumber: this._accountNumber,
      notes: this._notes,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
