import { parse } from 'csv-parse/sync';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, DatabaseError } from '@lifeOS/core/shared/errors';
import { TransactionCategory } from '../../domain/value-objects/InvoiceEnums';

/**
 * Parsed Bank Transaction Data
 *
 * Represents a single transaction parsed from CSV.
 */
export interface ParsedBankTransaction {
  date: Date;
  counterpartyAccount?: string;
  counterpartyName?: string;
  description: string;
  amount: number; // Negative = expense, Positive = income
  currency: string;
  category?: TransactionCategory;
}

/**
 * Belgian Bank CSV Parser
 *
 * Parses CSV exports from Belgian banks (Belfius, KBC, ING, etc.).
 *
 * Format characteristics:
 * - Semicolon-separated values
 * - European date format: DD/MM/YYYY
 * - European number format: comma as decimal separator (e.g., -329,95)
 * - Header at line 13 (first 12 lines are metadata)
 * - Encoding: UTF-8 with BOM or Windows-1252
 *
 * Columns (Belfius format):
 * - Boekingsdatum: Transaction date
 * - Rekening tegenpartij: Counterparty account (IBAN)
 * - Naam tegenpartij bevat: Counterparty name
 * - Transactie: Transaction description
 * - Bedrag: Amount (negative = expense, positive = income)
 * - Devies: Currency (EUR, USD, etc.)
 */
export class BelgianBankCSVParser {
  private static readonly HEADER_SKIP_LINES = 12; // Skip metadata lines
  private static readonly DELIMITER = ';';

  /**
   * Parse Belgian bank CSV file
   *
   * @param csvBuffer CSV file as buffer
   * @param encoding File encoding (default: utf-8)
   * @returns Array of parsed transactions
   */
  static parse(
    csvBuffer: Buffer,
    encoding: BufferEncoding = 'utf-8'
  ): Result<ParsedBankTransaction[], BaseError> {
    try {
      // Convert buffer to string
      let csvText = csvBuffer.toString(encoding);

      // Remove BOM if present
      if (csvText.charCodeAt(0) === 0xfeff) {
        csvText = csvText.slice(1);
      }

      // Split into lines
      const lines = csvText.split(/\r?\n/);

      // Skip metadata lines (first 12 lines)
      const dataLines = lines.slice(this.HEADER_SKIP_LINES);

      if (dataLines.length < 2) {
        return Result.fail(
          new ValidationError('CSV file is empty or has no transactions after header')
        );
      }

      // Parse CSV with header
      const records = parse(dataLines.join('\n'), {
        delimiter: this.DELIMITER,
        columns: true, // Use first row as header
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });

      // Transform records to ParsedBankTransaction
      const transactions: ParsedBankTransaction[] = [];

      for (const record of records) {
        const transaction = this.parseRecord(record);
        if (transaction.isOk()) {
          transactions.push(transaction.value);
        } else {
          // Log warning but continue parsing other rows
          console.warn(`Failed to parse transaction row: ${transaction.error.message}`, record);
        }
      }

      if (transactions.length === 0) {
        return Result.fail(
          new ValidationError('No valid transactions found in CSV file')
        );
      }

      return Result.ok(transactions);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to parse Belgian bank CSV', error)
      );
    }
  }

  /**
   * Parse a single CSV record to transaction
   */
  private static parseRecord(record: any): Result<ParsedBankTransaction, BaseError> {
    try {
      // Detect column names (different banks use different names)
      const dateField = this.findField(record, [
        'Boekingsdatum',
        'Datum',
        'Date',
        'Valutadatum',
      ]);
      const counterpartyAccountField = this.findField(record, [
        'Rekening tegenpartij',
        'Tegenpartij',
        'Account',
        'IBAN',
      ]);
      const counterpartyNameField = this.findField(record, [
        'Naam tegenpartij bevat',
        'Naam tegenpartij',
        'Tegenpartij naam',
        'Name',
        'Begunstigde',
      ]);
      const descriptionField = this.findField(record, [
        'Transactie',
        'Omschrijving',
        'Mededeling',
        'Description',
        'Details',
      ]);
      const amountField = this.findField(record, [
        'Bedrag',
        'Amount',
        'Montant',
      ]);
      const currencyField = this.findField(record, [
        'Devies',
        'Munt',
        'Currency',
        'Devise',
      ]);

      if (!dateField || !amountField) {
        return Result.fail(
          new ValidationError('Required fields (date, amount) not found in CSV row')
        );
      }

      // Parse date (DD/MM/YYYY format)
      const date = this.parseEuropeanDate(record[dateField]);
      if (!date) {
        return Result.fail(new ValidationError(`Invalid date format: ${record[dateField]}`));
      }

      // Parse amount (European format: -1.234,56)
      const amount = this.parseEuropeanNumber(record[amountField]);
      if (amount === null) {
        return Result.fail(new ValidationError(`Invalid amount format: ${record[amountField]}`));
      }

      // Extract counterparty account (optional)
      const counterpartyAccount = counterpartyAccountField
        ? this.sanitizeIBAN(record[counterpartyAccountField])
        : undefined;

      // Extract counterparty name (optional)
      const counterpartyName = counterpartyNameField
        ? record[counterpartyNameField]?.trim()
        : undefined;

      // Extract description
      const description = descriptionField
        ? record[descriptionField]?.trim() || 'No description'
        : 'No description';

      // Extract currency (default: EUR)
      const currency = currencyField ? record[currencyField]?.trim() || 'EUR' : 'EUR';

      // Auto-categorize based on description and counterparty
      const category = this.autoCategorizeTransaction(
        description,
        counterpartyName,
        amount
      );

      const transaction: ParsedBankTransaction = {
        date,
        counterpartyAccount,
        counterpartyName,
        description,
        amount,
        currency,
        category,
      };

      return Result.ok(transaction);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to parse transaction record', undefined, { error })
      );
    }
  }

  /**
   * Find field in record by trying multiple possible column names
   */
  private static findField(record: any, possibleNames: string[]): string | undefined {
    for (const name of possibleNames) {
      if (record[name] !== undefined) {
        return name;
      }
    }
    return undefined;
  }

  /**
   * Parse European date format (DD/MM/YYYY)
   */
  private static parseEuropeanDate(dateString: string): Date | null {
    if (!dateString) return null;

    // Try DD/MM/YYYY format
    const parts = dateString.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        // Validate date is valid
        if (date.getDate() === day && date.getMonth() === month) {
          return date;
        }
      }
    }

    // Try ISO format as fallback
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    return null;
  }

  /**
   * Parse European number format (comma as decimal separator)
   * Examples: "1.234,56" -> 1234.56, "-329,95" -> -329.95
   */
  private static parseEuropeanNumber(numberString: string): number | null {
    if (!numberString) return null;

    // Remove whitespace
    let cleaned = numberString.trim();

    // Remove currency symbols
    cleaned = cleaned.replace(/[€$£]/g, '');

    // European format: 1.234,56 or -1.234,56
    // Replace thousand separators (.) with nothing
    cleaned = cleaned.replace(/\./g, '');
    // Replace decimal separator (,) with .
    cleaned = cleaned.replace(/,/g, '.');

    const number = parseFloat(cleaned);

    if (isNaN(number)) {
      return null;
    }

    return number;
  }

  /**
   * Sanitize IBAN (remove spaces, uppercase)
   */
  private static sanitizeIBAN(iban: string): string | undefined {
    if (!iban) return undefined;

    const cleaned = iban.trim().replace(/\s/g, '').toUpperCase();

    // Validate IBAN format (basic check)
    if (cleaned.length < 15 || !/^[A-Z]{2}[0-9]{2}/.test(cleaned)) {
      return undefined;
    }

    return cleaned;
  }

  /**
   * Auto-categorize transaction based on description and counterparty
   */
  private static autoCategorizeTransaction(
    description: string,
    counterpartyName?: string,
    amount?: number
  ): TransactionCategory | undefined {
    const text = `${description} ${counterpartyName || ''}`.toLowerCase();

    // Income patterns
    if (amount && amount > 0) {
      if (
        text.includes('loon') ||
        text.includes('salaris') ||
        text.includes('salary') ||
        text.includes('wages')
      ) {
        return TransactionCategory.SALARY;
      }
      if (text.includes('factuur') || text.includes('invoice') || text.includes('payment')) {
        return TransactionCategory.REVENUE;
      }
    }

    // Expense patterns
    if (amount && amount < 0) {
      // Utilities
      if (
        text.includes('electrabel') ||
        text.includes('luminus') ||
        text.includes('engie') ||
        text.includes('electricity') ||
        text.includes('gas')
      ) {
        return TransactionCategory.UTILITIES;
      }

      // Telecom
      if (
        text.includes('telenet') ||
        text.includes('proximus') ||
        text.includes('orange') ||
        text.includes('scarlet') ||
        text.includes('mobile') ||
        text.includes('gsm')
      ) {
        return TransactionCategory.TELECOM;
      }

      // Software/SaaS
      if (
        text.includes('microsoft') ||
        text.includes('google') ||
        text.includes('adobe') ||
        text.includes('aws') ||
        text.includes('azure') ||
        text.includes('github') ||
        text.includes('vercel') ||
        text.includes('netlify')
      ) {
        return TransactionCategory.SOFTWARE;
      }

      // Hosting/Cloud
      if (
        text.includes('hetzner') ||
        text.includes('ovh') ||
        text.includes('digital ocean') ||
        text.includes('linode') ||
        text.includes('hosting')
      ) {
        return TransactionCategory.HOSTING;
      }

      // Marketing
      if (
        text.includes('google ads') ||
        text.includes('facebook ads') ||
        text.includes('linkedin ads') ||
        text.includes('mailchimp') ||
        text.includes('sendgrid')
      ) {
        return TransactionCategory.MARKETING;
      }

      // Fuel
      if (
        text.includes('shell') ||
        text.includes('total') ||
        text.includes('q8') ||
        text.includes('esso') ||
        text.includes('fuel') ||
        text.includes('benzine') ||
        text.includes('diesel')
      ) {
        return TransactionCategory.FUEL;
      }

      // Insurance
      if (text.includes('insurance') || text.includes('verzekering')) {
        return TransactionCategory.INSURANCE;
      }

      // Rent
      if (text.includes('huur') || text.includes('rent') || text.includes('lease')) {
        return TransactionCategory.RENT;
      }

      // Office supplies
      if (
        text.includes('staples') ||
        text.includes('office depot') ||
        text.includes('bol.com') ||
        text.includes('amazon')
      ) {
        return TransactionCategory.OFFICE_SUPPLIES;
      }

      // Legal/accounting
      if (
        text.includes('accountant') ||
        text.includes('boekhouder') ||
        text.includes('lawyer') ||
        text.includes('advocaat')
      ) {
        return TransactionCategory.PROFESSIONAL_SERVICES;
      }
    }

    return undefined; // No category detected
  }

  /**
   * Detect CSV encoding
   * Returns 'utf-8' or 'windows-1252'
   */
  static detectEncoding(buffer: Buffer): BufferEncoding {
    // Check for BOM
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf-8'; // UTF-8 with BOM
    }

    // Try to detect by looking for typical Belgian characters
    const text = buffer.toString('utf-8');
    const hasValidUtf8 = /[àáâãäåèéêëìíîïòóôõöùúûü]/i.test(text);

    return hasValidUtf8 ? 'utf-8' : 'latin1';
  }
}
