import { v4 as uuidv4 } from 'uuid';
import { ExpenseCategory } from './Expense';

/**
 * Feedback Types
 */
export type FeedbackType =
  | 'confirmed'  // User confirmed the suggested category
  | 'corrected'  // User corrected the suggested category
  | 'rejected';  // User rejected the suggestion entirely

/**
 * Transaction Classification Properties
 */
export interface TransactionClassificationProps {
  id: string;
  userId: string;
  transactionId: string;
  suggestedCategory?: ExpenseCategory;
  actualCategory: ExpenseCategory;
  confidence?: number;  // System confidence when suggestion was made (0-1)
  feedbackType: FeedbackType;
  createdAt: Date;
}

/**
 * Transaction Classification Entity
 *
 * Represents ML training data derived from user feedback on
 * transaction categorization suggestions.
 *
 * This entity serves as:
 * 1. Training data for ML categorization models
 * 2. Audit trail for categorization decisions
 * 3. Data source for improving rule-based categorization
 *
 * Business Rules:
 * - Confirmed feedback requires suggested and actual category to match
 * - Corrected feedback requires different suggested and actual categories
 * - Rejected feedback may not have a suggested category
 * - Confidence must be between 0 and 1 if provided
 */
export class TransactionClassification {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _transactionId: string;
  private readonly _suggestedCategory?: ExpenseCategory;
  private readonly _actualCategory: ExpenseCategory;
  private readonly _confidence?: number;
  private readonly _feedbackType: FeedbackType;
  private readonly _createdAt: Date;

  private constructor(props: TransactionClassificationProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._transactionId = props.transactionId;
    this._suggestedCategory = props.suggestedCategory;
    this._actualCategory = props.actualCategory;
    this._confidence = props.confidence;
    this._feedbackType = props.feedbackType;
    this._createdAt = props.createdAt;
  }

  /**
   * Create a new confirmed classification
   * User confirmed the suggested category
   */
  public static createConfirmed(
    userId: string,
    transactionId: string,
    category: ExpenseCategory,
    confidence?: number
  ): TransactionClassification {
    if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
      throw new Error('Confidence must be between 0 and 1');
    }

    return new TransactionClassification({
      id: uuidv4(),
      userId,
      transactionId,
      suggestedCategory: category,
      actualCategory: category,
      confidence,
      feedbackType: 'confirmed',
      createdAt: new Date(),
    });
  }

  /**
   * Create a new corrected classification
   * User corrected the suggested category to a different one
   */
  public static createCorrected(
    userId: string,
    transactionId: string,
    suggestedCategory: ExpenseCategory,
    actualCategory: ExpenseCategory,
    confidence?: number
  ): TransactionClassification {
    if (suggestedCategory === actualCategory) {
      throw new Error('Corrected classification must have different suggested and actual categories');
    }

    if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
      throw new Error('Confidence must be between 0 and 1');
    }

    return new TransactionClassification({
      id: uuidv4(),
      userId,
      transactionId,
      suggestedCategory,
      actualCategory,
      confidence,
      feedbackType: 'corrected',
      createdAt: new Date(),
    });
  }

  /**
   * Create a new rejected classification
   * User rejected the suggestion and provided manual category
   */
  public static createRejected(
    userId: string,
    transactionId: string,
    actualCategory: ExpenseCategory,
    suggestedCategory?: ExpenseCategory,
    confidence?: number
  ): TransactionClassification {
    if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
      throw new Error('Confidence must be between 0 and 1');
    }

    return new TransactionClassification({
      id: uuidv4(),
      userId,
      transactionId,
      suggestedCategory,
      actualCategory,
      confidence,
      feedbackType: 'rejected',
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitute Classification from persistence
   */
  public static reconstitute(props: TransactionClassificationProps): TransactionClassification {
    return new TransactionClassification(props);
  }

  /**
   * Check if suggestion was accurate
   */
  public isAccurate(): boolean {
    return this._feedbackType === 'confirmed';
  }

  /**
   * Check if suggestion was corrected
   */
  public wasCorrected(): boolean {
    return this._feedbackType === 'corrected';
  }

  /**
   * Check if suggestion was rejected
   */
  public wasRejected(): boolean {
    return this._feedbackType === 'rejected';
  }

  /**
   * Get confidence threshold this classification represents
   * Used for ML model improvement - high confidence mistakes are more valuable
   */
  public getConfidenceThreshold(): 'high' | 'medium' | 'low' | 'none' {
    if (!this._confidence) return 'none';

    if (this._confidence >= 0.8) return 'high';
    if (this._confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Calculate ML training weight
   * Higher weight for high-confidence mistakes and low-confidence successes
   */
  public getTrainingWeight(): number {
    if (!this._confidence) return 1.0;

    switch (this._feedbackType) {
      case 'confirmed':
        // Low confidence confirmations are valuable (model was uncertain but correct)
        return 1.0 + (1.0 - this._confidence);

      case 'corrected':
        // High confidence corrections are very valuable (model was wrong and confident)
        return 1.0 + this._confidence;

      case 'rejected':
        // Medium weight for rejections
        return 1.0;

      default:
        return 1.0;
    }
  }

  /**
   * Check if this is high-value training data
   * High value = either very confident mistake or very uncertain success
   */
  public isHighValueTrainingData(): boolean {
    if (!this._confidence) return false;

    // High confidence mistake (confidence > 0.8 but corrected/rejected)
    if (this._confidence > 0.8 && this._feedbackType !== 'confirmed') {
      return true;
    }

    // Low confidence success (confidence < 0.6 but confirmed)
    if (this._confidence < 0.6 && this._feedbackType === 'confirmed') {
      return true;
    }

    return false;
  }

  // Getters
  public get id(): string { return this._id; }
  public get userId(): string { return this._userId; }
  public get transactionId(): string { return this._transactionId; }
  public get suggestedCategory(): ExpenseCategory | undefined { return this._suggestedCategory; }
  public get actualCategory(): ExpenseCategory { return this._actualCategory; }
  public get confidence(): number | undefined { return this._confidence; }
  public get feedbackType(): FeedbackType { return this._feedbackType; }
  public get createdAt(): Date { return this._createdAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): TransactionClassificationProps {
    return {
      id: this._id,
      userId: this._userId,
      transactionId: this._transactionId,
      suggestedCategory: this._suggestedCategory,
      actualCategory: this._actualCategory,
      confidence: this._confidence,
      feedbackType: this._feedbackType,
      createdAt: this._createdAt,
    };
  }
}
