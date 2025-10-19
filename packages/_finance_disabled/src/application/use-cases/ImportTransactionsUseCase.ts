import { createHash } from 'crypto';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { BankTransaction } from '../../domain/entities';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { IBankTransactionRepository } from '../../domain/interfaces';
import {
  BelgianBankCSVParser,
  ParsedBankTransaction,
} from '../../infrastructure/parsers';
import { TransactionCategory } from '../../domain/value-objects/InvoiceEnums';

/**
 * Import Bank Transactions Use Case
 *
 * Imports bank transactions from CSV file with duplicate detection.
 * Supports Belgian bank formats (Belfius, KBC, ING, etc.).
 *
 * Business Rules:
 * - CSV must be valid Belgian bank format
 * - Duplicate detection based on hash of date + amount + description
 * - Auto-categorization using pattern matching
 * - All transactions linked to a specific bank account
 * - Transactions start with PENDING reconciliation status
 *
 * Process:
 * 1. Parse CSV file
 * 2. Generate unique hash for each transaction (duplicate detection)
 * 3. Check which transactions already exist
 * 4. Create BankTransaction entities for new transactions
 * 5. Bulk save to database
 * 6. Publish TransactionsImported event
 * 7. Return import statistics
 */
export class ImportTransactionsUseCase {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute transaction import from CSV
   *
   * @param csvBuffer CSV file contents
   * @param bankAccountId Bank account to link transactions to
   * @param options Import options
   * @returns Import statistics
   */
  async execute(
    csvBuffer: Buffer,
    bankAccountId: string,
    options?: {
      encoding?: BufferEncoding;
      skipDuplicates?: boolean; // Default: true
      updateExisting?: boolean; // Update if duplicate found (default: false)
    }
  ): Promise<
    Result<
      {
        total: number;
        imported: number;
        skipped: number;
        updated: number;
        errors: number;
        transactions: BankTransaction[];
      },
      BaseError
    >
  > {
    // Step 1: Parse CSV file
    const encoding = options?.encoding || BelgianBankCSVParser.detectEncoding(csvBuffer);

    const parseResult = BelgianBankCSVParser.parse(csvBuffer, encoding);
    if (parseResult.isFail()) {
      return Result.fail(parseResult.error);
    }

    const parsedTransactions = parseResult.value;

    if (parsedTransactions.length === 0) {
      return Result.fail(new ValidationError('No transactions found in CSV file'));
    }

    // Step 2: Process each transaction
    const stats = {
      total: parsedTransactions.length,
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: 0,
    };

    const newTransactions: BankTransaction[] = [];
    const existingToUpdate: BankTransaction[] = [];

    for (const parsed of parsedTransactions) {
      try {
        // Generate unique hash for duplicate detection
        const externalId = this.generateTransactionHash(parsed);

        // Check if transaction already exists
        const existingResult = await this.transactionRepository.findByExternalId(
          bankAccountId,
          externalId
        );

        if (existingResult.isFail()) {
          stats.errors++;
          continue;
        }

        const existing = existingResult.value;

        if (existing) {
          // Transaction already exists
          if (options?.updateExisting) {
            // Update existing transaction
            this.updateTransactionFromParsed(existing, parsed);
            existingToUpdate.push(existing);
            stats.updated++;
          } else {
            // Skip duplicate
            stats.skipped++;
          }
          continue;
        }

        // Create new transaction entity
        const transaction = this.createTransactionFromParsed(parsed, bankAccountId, externalId);
        newTransactions.push(transaction);
      } catch (error) {
        console.error('Failed to process transaction:', error, parsed);
        stats.errors++;
      }
    }

    // Step 3: Bulk save new transactions
    if (newTransactions.length > 0) {
      const saveResult = await this.transactionRepository.saveMany(newTransactions);
      if (saveResult.isFail()) {
        return Result.fail(saveResult.error);
      }
      stats.imported = newTransactions.length;
    }

    // Step 4: Update existing transactions if requested
    if (existingToUpdate.length > 0) {
      const updateResult = await this.transactionRepository.saveMany(existingToUpdate);
      if (updateResult.isFail()) {
        return Result.fail(updateResult.error);
      }
    }

    // Step 5: Publish TransactionsImported event
    await this.eventBus.publish({
      type: 'TransactionsImported',
      source: 'finance',
      payload: {
        bankAccountId,
        imported: stats.imported,
        skipped: stats.skipped,
        updated: stats.updated,
        total: stats.total,
        errors: stats.errors,
      },
      timestamp: new Date(),
    });

    // Step 6: Return import statistics
    return Result.ok({
      ...stats,
      transactions: newTransactions,
    });
  }

  /**
   * Generate unique hash for transaction (for duplicate detection)
   *
   * Uses date + amount + description to create a deterministic hash.
   * This allows detecting exact duplicates even without external IDs.
   */
  private generateTransactionHash(transaction: ParsedBankTransaction): string {
    const dateStr = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD
    const amountStr = transaction.amount.toFixed(2);
    const descriptionStr = transaction.description.trim().toLowerCase();

    const hashInput = `${dateStr}|${amountStr}|${descriptionStr}`;

    return createHash('sha256').update(hashInput).digest('hex').substring(0, 32);
  }

  /**
   * Create BankTransaction entity from parsed CSV data
   */
  private createTransactionFromParsed(
    parsed: ParsedBankTransaction,
    bankAccountId: string,
    externalId: string
  ): BankTransaction {
    // Map TransactionCategory to ExpenseCategory if needed
    const suggestedCategory = this.mapToExpenseCategory(parsed.category);

    const transaction = BankTransaction.create({
      bankAccountId,
      externalId,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      counterPartyName: parsed.counterpartyName,
      counterPartyIban: parsed.counterpartyAccount,
      executionDate: parsed.date,
      valueDate: parsed.date, // Same as execution date for CSV imports
      suggestedCategory,
      confidenceScore: suggestedCategory ? 75 : undefined, // Auto-categorization confidence
    });

    return transaction;
  }

  /**
   * Update existing transaction with parsed data
   */
  private updateTransactionFromParsed(
    existing: BankTransaction,
    parsed: ParsedBankTransaction
  ): void {
    // Update category if auto-detected
    if (parsed.category) {
      const category = this.mapToExpenseCategory(parsed.category);
      if (category) {
        existing.setSuggestedCategory(category, 75);
      }
    }
  }

  /**
   * Map TransactionCategory (from invoice enums) to ExpenseCategory
   *
   * Note: TransactionCategory and ExpenseCategory have some overlap
   * but are separate enum types. This mapper bridges them.
   */
  private mapToExpenseCategory(category?: TransactionCategory): ExpenseCategory | undefined {
    if (!category) return undefined;

    // Direct mappings
    // ExpenseCategory type: 'housing' | 'utilities' | 'groceries' | 'transportation' | 'healthcare' |
    // 'insurance' | 'entertainment' | 'dining' | 'shopping' | 'education' | 'savings' |
    // 'debt_payment' | 'investments' | 'gifts' | 'other'
    const categoryMap: Record<string, ExpenseCategory> = {
      [TransactionCategory.UTILITIES]: 'utilities',
      [TransactionCategory.OFFICE_RENT]: 'housing',
      [TransactionCategory.INSURANCE]: 'insurance',
      [TransactionCategory.SOFTWARE]: 'other',
      [TransactionCategory.SAAS]: 'other',
      [TransactionCategory.HOSTING]: 'other',
      [TransactionCategory.MARKETING]: 'other',
      [TransactionCategory.ADVERTISING]: 'other',
      [TransactionCategory.OFFICE_SUPPLIES]: 'other',
      [TransactionCategory.FUEL]: 'transportation',
      [TransactionCategory.TRAVEL]: 'transportation',
      [TransactionCategory.PARKING]: 'transportation',
      [TransactionCategory.TOLLS]: 'transportation',
      [TransactionCategory.LEGAL]: 'other',
      [TransactionCategory.ACCOUNTING]: 'other',
      [TransactionCategory.CONSULTING]: 'other',
      [TransactionCategory.FREELANCE]: 'other',
      [TransactionCategory.SALARY]: 'other',
      [TransactionCategory.BENEFITS]: 'healthcare',
      [TransactionCategory.TRAINING]: 'education',
      [TransactionCategory.BANK_FEES]: 'other',
      [TransactionCategory.TAX]: 'other',
      [TransactionCategory.LOAN_PAYMENT]: 'debt_payment',
      [TransactionCategory.MEALS]: 'dining',
      [TransactionCategory.ENTERTAINMENT]: 'entertainment',
      [TransactionCategory.EQUIPMENT]: 'other',
      [TransactionCategory.MAINTENANCE]: 'other',
      [TransactionCategory.OTHER]: 'other',
      [TransactionCategory.UNCATEGORIZED]: 'other',
    };

    return categoryMap[category] || 'other';
  }

  /**
   * Validate bank account exists and is accessible
   */
  async validateBankAccount(bankAccountId: string): Promise<Result<boolean, BaseError>> {
    // In a full implementation, check if bank account exists
    // For now, just validate the ID format
    if (!bankAccountId || bankAccountId.trim().length === 0) {
      return Result.fail(new ValidationError('Bank account ID is required'));
    }

    // UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bankAccountId)) {
      return Result.fail(new ValidationError('Invalid bank account ID format'));
    }

    return Result.ok(true);
  }

  /**
   * Get import preview (parse CSV but don't save)
   *
   * Useful for showing user what will be imported before committing.
   */
  async preview(
    csvBuffer: Buffer,
    bankAccountId: string,
    options?: { encoding?: BufferEncoding }
  ): Promise<
    Result<
      {
        total: number;
        newTransactions: number;
        duplicates: number;
        preview: Array<{
          date: string;
          amount: number;
          description: string;
          category?: string;
          isDuplicate: boolean;
        }>;
      },
      BaseError
    >
  > {
    // Parse CSV
    const encoding = options?.encoding || BelgianBankCSVParser.detectEncoding(csvBuffer);

    const parseResult = BelgianBankCSVParser.parse(csvBuffer, encoding);
    if (parseResult.isFail()) {
      return Result.fail(parseResult.error);
    }

    const parsedTransactions = parseResult.value;

    let newCount = 0;
    let duplicateCount = 0;

    const preview = await Promise.all(
      parsedTransactions.map(async (parsed) => {
        const externalId = this.generateTransactionHash(parsed);

        // Check if exists
        const existingResult = await this.transactionRepository.findByExternalId(
          bankAccountId,
          externalId
        );
        const isDuplicate = existingResult.isOk() && existingResult.value !== null;

        if (isDuplicate) {
          duplicateCount++;
        } else {
          newCount++;
        }

        return {
          date: parsed.date.toISOString(),
          amount: parsed.amount,
          description: parsed.description,
          category: parsed.category,
          isDuplicate,
        };
      })
    );

    return Result.ok({
      total: parsedTransactions.length,
      newTransactions: newCount,
      duplicates: duplicateCount,
      preview,
    });
  }
}
