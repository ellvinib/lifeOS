import { v4 as uuidv4 } from 'uuid';
import { MatchConfidence } from '../value-objects/InvoiceEnums';

/**
 * InvoiceTransactionMatch Entity Properties
 */
export interface InvoiceTransactionMatchProps {
  id: string;
  invoiceId: string;
  transactionId: string; // Bank transaction ID
  matchConfidence: MatchConfidence;
  matchScore: number; // Numeric score 0-100
  matchedBy: 'system' | 'user';
  matchedByUserId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  matchedAt: Date;
  createdAt: Date;
}

/**
 * InvoiceTransactionMatch Entity
 *
 * Represents the matching relationship between an invoice and a bank transaction.
 * Supports both auto-matching and manual matching with confidence tracking.
 *
 * Business Rules:
 * - One invoice can match multiple transactions (partial payments)
 * - One transaction can match multiple invoices (combined payment)
 * - Match confidence determined by score threshold
 * - Manual matches always have HIGH confidence
 * - Cannot create duplicate matches (same invoice + transaction)
 */
export class InvoiceTransactionMatch {
  private readonly _id: string;
  private readonly _invoiceId: string;
  private readonly _transactionId: string;
  private _matchConfidence: MatchConfidence;
  private _matchScore: number;
  private readonly _matchedBy: 'system' | 'user';
  private readonly _matchedByUserId?: string;
  private _notes?: string;
  private _metadata?: Record<string, unknown>;
  private readonly _matchedAt: Date;
  private readonly _createdAt: Date;

  private constructor(props: InvoiceTransactionMatchProps) {
    this._id = props.id;
    this._invoiceId = props.invoiceId;
    this._transactionId = props.transactionId;
    this._matchConfidence = props.matchConfidence;
    this._matchScore = props.matchScore;
    this._matchedBy = props.matchedBy;
    this._matchedByUserId = props.matchedByUserId;
    this._notes = props.notes;
    this._metadata = props.metadata;
    this._matchedAt = props.matchedAt;
    this._createdAt = props.createdAt;
  }

  /**
   * Create an auto-matched relationship (system suggested)
   */
  public static createAutoMatch(
    invoiceId: string,
    transactionId: string,
    matchScore: number
  ): InvoiceTransactionMatch {
    if (!invoiceId || !transactionId) {
      throw new Error('Invoice ID and Transaction ID are required');
    }

    if (matchScore < 0 || matchScore > 100) {
      throw new Error('Match score must be between 0 and 100');
    }

    // Determine confidence based on score
    let confidence: MatchConfidence;
    if (matchScore >= 90) {
      confidence = MatchConfidence.HIGH;
    } else if (matchScore >= 50) {
      confidence = MatchConfidence.MEDIUM;
    } else {
      confidence = MatchConfidence.LOW;
    }

    const now = new Date();
    return new InvoiceTransactionMatch({
      id: uuidv4(),
      invoiceId,
      transactionId,
      matchConfidence: confidence,
      matchScore,
      matchedBy: 'system',
      matchedAt: now,
      createdAt: now,
    });
  }

  /**
   * Create a manual match (user confirmed or created)
   */
  public static createManualMatch(
    invoiceId: string,
    transactionId: string,
    userId?: string,
    notes?: string
  ): InvoiceTransactionMatch {
    if (!invoiceId || !transactionId) {
      throw new Error('Invoice ID and Transaction ID are required');
    }

    const now = new Date();
    return new InvoiceTransactionMatch({
      id: uuidv4(),
      invoiceId,
      transactionId,
      matchConfidence: MatchConfidence.MANUAL,
      matchScore: 100, // Manual matches are considered perfect
      matchedBy: 'user',
      matchedByUserId: userId,
      notes,
      matchedAt: now,
      createdAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  public static reconstitute(props: InvoiceTransactionMatchProps): InvoiceTransactionMatch {
    return new InvoiceTransactionMatch(props);
  }

  /**
   * Update match notes
   */
  public updateNotes(notes: string): void {
    this._notes = notes;
  }

  /**
   * Add metadata
   */
  public addMetadata(key: string, value: unknown): void {
    if (!this._metadata) {
      this._metadata = {};
    }
    this._metadata[key] = value;
  }

  /**
   * Check if match was auto-generated
   */
  public isAutoMatch(): boolean {
    return this._matchedBy === 'system';
  }

  /**
   * Check if match was created manually
   */
  public isManualMatch(): boolean {
    return this._matchedBy === 'user';
  }

  /**
   * Check if match has high confidence
   */
  public hasHighConfidence(): boolean {
    return this._matchConfidence === MatchConfidence.HIGH ||
           this._matchConfidence === MatchConfidence.MANUAL;
  }

  /**
   * Check if match needs user review
   */
  public needsReview(): boolean {
    return this._matchConfidence === MatchConfidence.MEDIUM ||
           this._matchConfidence === MatchConfidence.LOW;
  }

  /**
   * Get confidence level as percentage
   */
  public getConfidencePercentage(): number {
    return this._matchScore;
  }

  /**
   * Get match age in days
   */
  public getMatchAgeDays(): number {
    const now = new Date();
    const diffTime = now.getTime() - this._matchedAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Getters
  public get id(): string { return this._id; }
  public get invoiceId(): string { return this._invoiceId; }
  public get transactionId(): string { return this._transactionId; }
  public get matchConfidence(): MatchConfidence { return this._matchConfidence; }
  public get matchScore(): number { return this._matchScore; }
  public get matchedBy(): 'system' | 'user' { return this._matchedBy; }
  public get matchedByUserId(): string | undefined { return this._matchedByUserId; }
  public get notes(): string | undefined { return this._notes; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get matchedAt(): Date { return this._matchedAt; }
  public get createdAt(): Date { return this._createdAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): InvoiceTransactionMatchProps {
    return {
      id: this._id,
      invoiceId: this._invoiceId,
      transactionId: this._transactionId,
      matchConfidence: this._matchConfidence,
      matchScore: this._matchScore,
      matchedBy: this._matchedBy,
      matchedByUserId: this._matchedByUserId,
      notes: this._notes,
      metadata: this._metadata,
      matchedAt: this._matchedAt,
      createdAt: this._createdAt,
    };
  }
}
