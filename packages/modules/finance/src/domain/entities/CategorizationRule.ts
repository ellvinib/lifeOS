import { v4 as uuidv4 } from 'uuid';
import { ExpenseCategory } from './Expense';

/**
 * Pattern Types for Rule Matching
 */
export type PatternType =
  | 'exact'      // Exact string match
  | 'contains'   // Contains substring
  | 'regex'      // Regular expression
  | 'iban';      // IBAN match

/**
 * Rule Source
 */
export type RuleSource =
  | 'user'    // User-created rule
  | 'system'  // System-provided rule
  | 'ml';     // ML-generated rule

/**
 * Categorization Rule Properties
 */
export interface CategorizationRuleProps {
  id: string;
  userId: string;
  pattern: string;
  patternType: PatternType;
  category: ExpenseCategory;
  confidence: number;  // 0-1
  priority: number;
  isActive: boolean;
  source: RuleSource;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Categorization Rule Entity
 *
 * Represents a rule for automatically categorizing bank transactions.
 * Supports pattern matching with different strategies (exact, contains, regex, IBAN).
 *
 * Business Rules:
 * - Confidence must be between 0 and 1
 * - Higher priority rules are evaluated first
 * - Pattern must be valid for its type
 * - Regex patterns must compile successfully
 */
export class CategorizationRule {
  private readonly _id: string;
  private readonly _userId: string;
  private _pattern: string;
  private _patternType: PatternType;
  private _category: ExpenseCategory;
  private _confidence: number;
  private _priority: number;
  private _isActive: boolean;
  private readonly _source: RuleSource;
  private _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CategorizationRuleProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._pattern = props.pattern;
    this._patternType = props.patternType;
    this._category = props.category;
    this._confidence = props.confidence;
    this._priority = props.priority;
    this._isActive = props.isActive;
    this._source = props.source;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new Categorization Rule
   */
  public static create(
    userId: string,
    pattern: string,
    patternType: PatternType,
    category: ExpenseCategory,
    options?: {
      confidence?: number;
      priority?: number;
      isActive?: boolean;
      source?: RuleSource;
      metadata?: Record<string, unknown>;
    }
  ): CategorizationRule {
    // Validate confidence
    const confidence = options?.confidence ?? 1.0;
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    // Validate pattern
    if (!pattern || pattern.trim().length === 0) {
      throw new Error('Pattern cannot be empty');
    }

    // Validate regex patterns
    if (patternType === 'regex') {
      try {
        new RegExp(pattern);
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${(error as Error).message}`);
      }
    }

    // Validate IBAN pattern
    if (patternType === 'iban') {
      const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
      if (!ibanPattern.test(pattern.toUpperCase())) {
        throw new Error('Invalid IBAN pattern');
      }
    }

    const now = new Date();
    return new CategorizationRule({
      id: uuidv4(),
      userId,
      pattern: patternType === 'iban' ? pattern.toUpperCase() : pattern,
      patternType,
      category,
      confidence,
      priority: options?.priority ?? 0,
      isActive: options?.isActive ?? true,
      source: options?.source ?? 'user',
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute Rule from persistence
   */
  public static reconstitute(props: CategorizationRuleProps): CategorizationRule {
    return new CategorizationRule(props);
  }

  /**
   * Update rule details
   */
  public update(updates: {
    pattern?: string;
    patternType?: PatternType;
    category?: ExpenseCategory;
    confidence?: number;
    priority?: number;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  }): void {
    if (updates.confidence !== undefined) {
      if (updates.confidence < 0 || updates.confidence > 1) {
        throw new Error('Confidence must be between 0 and 1');
      }
      this._confidence = updates.confidence;
    }

    if (updates.pattern !== undefined || updates.patternType !== undefined) {
      const newPattern = updates.pattern ?? this._pattern;
      const newPatternType = updates.patternType ?? this._patternType;

      // Validate new pattern
      if (newPatternType === 'regex') {
        try {
          new RegExp(newPattern);
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${(error as Error).message}`);
        }
      }

      if (updates.pattern !== undefined) this._pattern = newPattern;
      if (updates.patternType !== undefined) this._patternType = newPatternType;
    }

    if (updates.category !== undefined) this._category = updates.category;
    if (updates.priority !== undefined) this._priority = updates.priority;
    if (updates.isActive !== undefined) this._isActive = updates.isActive;
    if (updates.metadata !== undefined) this._metadata = updates.metadata;

    this._updatedAt = new Date();
  }

  /**
   * Test if rule matches a given text
   */
  public matches(text: string, iban?: string): boolean {
    if (!this._isActive) {
      return false;
    }

    const textLower = text.toLowerCase();
    const patternLower = this._pattern.toLowerCase();

    switch (this._patternType) {
      case 'exact':
        return textLower === patternLower;

      case 'contains':
        return textLower.includes(patternLower);

      case 'regex':
        try {
          const regex = new RegExp(this._pattern, 'i'); // Case-insensitive
          return regex.test(text);
        } catch {
          return false; // Invalid regex, fail gracefully
        }

      case 'iban':
        if (!iban) return false;
        return iban.toUpperCase() === this._pattern.toUpperCase();

      default:
        return false;
    }
  }

  /**
   * Activate the rule
   */
  public activate(): void {
    if (!this._isActive) {
      this._isActive = true;
      this._updatedAt = new Date();
    }
  }

  /**
   * Deactivate the rule
   */
  public deactivate(): void {
    if (this._isActive) {
      this._isActive = false;
      this._updatedAt = new Date();
    }
  }

  /**
   * Increase rule priority
   */
  public increasePriority(amount: number = 1): void {
    this._priority += amount;
    this._updatedAt = new Date();
  }

  /**
   * Decrease rule priority
   */
  public decreasePriority(amount: number = 1): void {
    this._priority = Math.max(0, this._priority - amount);
    this._updatedAt = new Date();
  }

  /**
   * Check if rule is user-created
   */
  public isUserCreated(): boolean {
    return this._source === 'user';
  }

  /**
   * Check if rule is system-provided
   */
  public isSystemRule(): boolean {
    return this._source === 'system';
  }

  /**
   * Check if rule is ML-generated
   */
  public isMLGenerated(): boolean {
    return this._source === 'ml';
  }

  // Getters
  public get id(): string { return this._id; }
  public get userId(): string { return this._userId; }
  public get pattern(): string { return this._pattern; }
  public get patternType(): PatternType { return this._patternType; }
  public get category(): ExpenseCategory { return this._category; }
  public get confidence(): number { return this._confidence; }
  public get priority(): number { return this._priority; }
  public get isActive(): boolean { return this._isActive; }
  public get source(): RuleSource { return this._source; }
  public get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Convert to plain object for persistence
   */
  public toObject(): CategorizationRuleProps {
    return {
      id: this._id,
      userId: this._userId,
      pattern: this._pattern,
      patternType: this._patternType,
      category: this._category,
      confidence: this._confidence,
      priority: this._priority,
      isActive: this._isActive,
      source: this._source,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
