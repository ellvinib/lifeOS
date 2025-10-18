import { v4 as uuidv4 } from 'uuid';

/**
 * Insurance Types
 */
export type InsuranceType =
  | 'life'
  | 'health'
  | 'home'
  | 'auto'
  | 'renters'
  | 'disability'
  | 'pet'
  | 'travel'
  | 'umbrella'
  | 'other';

/**
 * Insurance Status
 */
export type InsuranceStatus = 'active' | 'pending' | 'expired' | 'cancelled';

/**
 * Premium Frequency
 */
export type PremiumFrequency = 'monthly' | 'quarterly' | 'semi_annually' | 'annually';

/**
 * Insurance Entity Properties
 */
export interface InsuranceProps {
  id: string;
  type: InsuranceType;
  provider: string;
  policyNumber: string;
  status: InsuranceStatus;
  coverageAmount: number;
  premiumAmount: number;
  premiumFrequency: PremiumFrequency;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  deductible?: number;
  beneficiaries?: string[];
  notes?: string;
  documentUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insurance Entity
 *
 * Represents an insurance policy with coverage details, premium tracking,
 * and renewal management.
 *
 * Business Rules:
 * - Coverage amount must be positive
 * - Premium amount must be positive
 * - End date must be after start date
 * - Renewal date should be before or equal to end date
 * - Deductible must be positive if provided
 */
export class Insurance {
  private readonly _id: string;
  private _type: InsuranceType;
  private _provider: string;
  private _policyNumber: string;
  private _status: InsuranceStatus;
  private _coverageAmount: number;
  private _premiumAmount: number;
  private _premiumFrequency: PremiumFrequency;
  private _startDate: Date;
  private _endDate?: Date;
  private _renewalDate?: Date;
  private _deductible?: number;
  private _beneficiaries?: string[];
  private _notes?: string;
  private _documentUrl?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InsuranceProps) {
    this._id = props.id;
    this._type = props.type;
    this._provider = props.provider;
    this._policyNumber = props.policyNumber;
    this._status = props.status;
    this._coverageAmount = props.coverageAmount;
    this._premiumAmount = props.premiumAmount;
    this._premiumFrequency = props.premiumFrequency;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
    this._renewalDate = props.renewalDate;
    this._deductible = props.deductible;
    this._beneficiaries = props.beneficiaries;
    this._notes = props.notes;
    this._documentUrl = props.documentUrl;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Insurance policy
   */
  public static create(
    type: InsuranceType,
    provider: string,
    policyNumber: string,
    status: InsuranceStatus,
    coverageAmount: number,
    premiumAmount: number,
    premiumFrequency: PremiumFrequency,
    startDate: Date,
    options?: {
      endDate?: Date;
      renewalDate?: Date;
      deductible?: number;
      beneficiaries?: string[];
      notes?: string;
      documentUrl?: string;
      metadata?: Record<string, unknown>;
    }
  ): Insurance {
    if (coverageAmount <= 0) {
      throw new Error('Coverage amount must be positive');
    }

    if (premiumAmount <= 0) {
      throw new Error('Premium amount must be positive');
    }

    if (options?.endDate && options.endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    if (options?.renewalDate && options?.endDate && options.renewalDate > options.endDate) {
      throw new Error('Renewal date must be before or equal to end date');
    }

    if (options?.deductible !== undefined && options.deductible < 0) {
      throw new Error('Deductible must be positive');
    }

    const now = new Date();
    return new Insurance({
      id: uuidv4(),
      type,
      provider,
      policyNumber,
      status,
      coverageAmount,
      premiumAmount,
      premiumFrequency,
      startDate,
      endDate: options?.endDate,
      renewalDate: options?.renewalDate,
      deductible: options?.deductible,
      beneficiaries: options?.beneficiaries,
      notes: options?.notes,
      documentUrl: options?.documentUrl,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Insurance from persistence
   */
  public static reconstitute(props: InsuranceProps): Insurance {
    return new Insurance(props);
  }

  /**
   * Update policy details
   */
  public update(updates: {
    provider?: string;
    status?: InsuranceStatus;
    coverageAmount?: number;
    premiumAmount?: number;
    premiumFrequency?: PremiumFrequency;
    endDate?: Date;
    renewalDate?: Date;
    deductible?: number;
    beneficiaries?: string[];
    notes?: string;
    documentUrl?: string;
  }): void {
    if (updates.coverageAmount !== undefined && updates.coverageAmount <= 0) {
      throw new Error('Coverage amount must be positive');
    }

    if (updates.premiumAmount !== undefined && updates.premiumAmount <= 0) {
      throw new Error('Premium amount must be positive');
    }

    if (updates.provider !== undefined) this._provider = updates.provider;
    if (updates.status !== undefined) this._status = updates.status;
    if (updates.coverageAmount !== undefined) this._coverageAmount = updates.coverageAmount;
    if (updates.premiumAmount !== undefined) this._premiumAmount = updates.premiumAmount;
    if (updates.premiumFrequency !== undefined) this._premiumFrequency = updates.premiumFrequency;
    if (updates.endDate !== undefined) this._endDate = updates.endDate;
    if (updates.renewalDate !== undefined) this._renewalDate = updates.renewalDate;
    if (updates.deductible !== undefined) this._deductible = updates.deductible;
    if (updates.beneficiaries !== undefined) this._beneficiaries = updates.beneficiaries;
    if (updates.notes !== undefined) this._notes = updates.notes;
    if (updates.documentUrl !== undefined) this._documentUrl = updates.documentUrl;

    this._updatedAt = new Date();
  }

  /**
   * Activate the policy
   */
  public activate(): void {
    if (this._status === 'cancelled') {
      throw new Error('Cannot activate a cancelled policy');
    }
    this._status = 'active';
    this._updatedAt = new Date();
  }

  /**
   * Cancel the policy
   */
  public cancel(): void {
    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  /**
   * Mark policy as expired
   */
  public markAsExpired(): void {
    this._status = 'expired';
    this._updatedAt = new Date();
  }

  /**
   * Renew the policy
   */
  public renew(newEndDate: Date, newRenewalDate?: Date): void {
    if (this._status === 'cancelled') {
      throw new Error('Cannot renew a cancelled policy');
    }

    this._endDate = newEndDate;
    this._renewalDate = newRenewalDate;
    this._status = 'active';
    this._updatedAt = new Date();
  }

  /**
   * Check if policy is active
   */
  public isActive(): boolean {
    return this._status === 'active';
  }

  /**
   * Check if policy is expired
   */
  public isExpired(): boolean {
    if (this._status === 'expired') return true;
    if (!this._endDate) return false;
    return new Date() > this._endDate;
  }

  /**
   * Check if renewal is due soon (within 30 days)
   */
  public isRenewalDue(): boolean {
    if (!this._renewalDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this._renewalDate <= thirtyDaysFromNow;
  }

  /**
   * Calculate annual premium cost
   */
  public getAnnualPremium(): number {
    switch (this._premiumFrequency) {
      case 'monthly':
        return this._premiumAmount * 12;
      case 'quarterly':
        return this._premiumAmount * 4;
      case 'semi_annually':
        return this._premiumAmount * 2;
      case 'annually':
        return this._premiumAmount;
    }
  }

  /**
   * Add beneficiary
   */
  public addBeneficiary(beneficiary: string): void {
    if (!this._beneficiaries) {
      this._beneficiaries = [];
    }
    if (!this._beneficiaries.includes(beneficiary)) {
      this._beneficiaries.push(beneficiary);
      this._updatedAt = new Date();
    }
  }

  /**
   * Remove beneficiary
   */
  public removeBeneficiary(beneficiary: string): void {
    if (!this._beneficiaries) return;
    const index = this._beneficiaries.indexOf(beneficiary);
    if (index !== -1) {
      this._beneficiaries.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  // Getters
  public get id(): string { return this._id; }
  public get type(): InsuranceType { return this._type; }
  public get provider(): string { return this._provider; }
  public get policyNumber(): string { return this._policyNumber; }
  public get status(): InsuranceStatus { return this._status; }
  public get coverageAmount(): number { return this._coverageAmount; }
  public get premiumAmount(): number { return this._premiumAmount; }
  public get premiumFrequency(): PremiumFrequency { return this._premiumFrequency; }
  public get startDate(): Date { return this._startDate; }
  public get endDate(): Date | undefined { return this._endDate; }
  public get renewalDate(): Date | undefined { return this._renewalDate; }
  public get deductible(): number | undefined { return this._deductible; }
  public get beneficiaries(): string[] | undefined { return this._beneficiaries ? [...this._beneficiaries] : undefined; }
  public get notes(): string | undefined { return this._notes; }
  public get documentUrl(): string | undefined { return this._documentUrl; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): InsuranceProps {
    return {
      id: this._id,
      type: this._type,
      provider: this._provider,
      policyNumber: this._policyNumber,
      status: this._status,
      coverageAmount: this._coverageAmount,
      premiumAmount: this._premiumAmount,
      premiumFrequency: this._premiumFrequency,
      startDate: this._startDate,
      endDate: this._endDate,
      renewalDate: this._renewalDate,
      deductible: this._deductible,
      beneficiaries: this._beneficiaries ? [...this._beneficiaries] : undefined,
      notes: this._notes,
      documentUrl: this._documentUrl,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
