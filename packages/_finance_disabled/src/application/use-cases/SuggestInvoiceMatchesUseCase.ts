import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { Invoice, InvoiceTransactionMatch, MatchConfidence } from '../../domain/entities';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import {
  IInvoiceRepository,
  IInvoiceTransactionMatchRepository,
} from '../../domain/interfaces';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';

/**
 * Match Suggestion Result
 *
 * Represents a suggested match between invoice and transaction with scoring details.
 */
export interface MatchSuggestion {
  invoice: Invoice;
  transaction: BankTransaction;
  matchScore: number; // 0-100
  matchConfidence: MatchConfidence;
  scoreBreakdown: {
    amountMatch: number; // 0-50
    dateMatch: number; // 0-20
    vendorMatch: number; // 0-25
    invoiceNumberMatch: number; // 0-30
    referenceMatch: number; // 0-10 bonus
  };
  suggestedAction: 'auto-match' | 'suggest' | 'manual-review';
}

/**
 * Suggest Invoice Matches Use Case
 *
 * Implements smart matching algorithm to find bank transactions that match invoices.
 * Uses multi-criteria scoring: amount (50pts), date (20pts), vendor (25pts), invoice# (30pts).
 *
 * Business Rules:
 * - Score >= 90: High confidence, can auto-match
 * - Score 50-89: Medium confidence, suggest to user
 * - Score < 50: Low confidence, manual review needed
 * - Only matches PENDING invoices with unmatched transactions
 * - Amount must be negative (expense) for invoice matching
 * - Date tolerance: ±7 days from invoice date
 *
 * Process:
 * 1. Get invoice(s) to match
 * 2. Find candidate transactions (unmatched, amount range, date range)
 * 3. Score each candidate using Invoice.calculateMatchScore()
 * 4. Filter by minimum score threshold
 * 5. Sort by score (highest first)
 * 6. Return ranked suggestions
 */
export class SuggestInvoiceMatchesUseCase {
  private static readonly MIN_SCORE_THRESHOLD = 30; // Minimum score to suggest
  private static readonly DATE_TOLERANCE_DAYS = 7; // ±7 days
  private static readonly AMOUNT_TOLERANCE_PERCENT = 0.05; // ±5%

  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly matchRepository: IInvoiceTransactionMatchRepository
  ) {}

  /**
   * Suggest matches for a single invoice
   *
   * @param invoiceId Invoice ID
   * @param options Matching options
   * @returns Ranked list of match suggestions
   */
  async suggestForInvoice(
    invoiceId: string,
    options?: {
      minScore?: number; // Minimum score threshold (default: 30)
      maxSuggestions?: number; // Maximum number of suggestions (default: 10)
      bankAccountId?: string; // Filter by specific bank account
    }
  ): Promise<Result<MatchSuggestion[], BaseError>> {
    // Step 1: Get invoice
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Validate invoice can be matched
    if (invoice.total <= 0) {
      return Result.fail(
        new BusinessRuleError('Invoice total must be positive to match with transactions')
      );
    }

    // Check if already matched
    const existingMatchResult = await this.matchRepository.findByInvoiceId(invoiceId);
    if (existingMatchResult.isOk() && existingMatchResult.value.length > 0) {
      // Invoice already has matches - return empty suggestions
      return Result.ok([]);
    }

    // Step 2: Find candidate transactions
    const candidatesResult = await this.findCandidateTransactions(invoice, options);
    if (candidatesResult.isFail()) {
      return Result.fail(candidatesResult.error);
    }

    const candidates = candidatesResult.value;

    // Step 3: Score and rank candidates
    const suggestions = this.scoreAndRankCandidates(invoice, candidates);

    // Step 4: Filter by minimum score
    const minScore = options?.minScore ?? SuggestInvoiceMatchesUseCase.MIN_SCORE_THRESHOLD;
    const filtered = suggestions.filter((s) => s.matchScore >= minScore);

    // Step 5: Limit results
    const maxSuggestions = options?.maxSuggestions ?? 10;
    const limited = filtered.slice(0, maxSuggestions);

    return Result.ok(limited);
  }

  /**
   * Suggest matches for all unmatched invoices
   *
   * @param options Matching options
   * @returns Map of invoice ID to match suggestions
   */
  async suggestForAllUnmatched(
    options?: {
      minScore?: number;
      maxSuggestionsPerInvoice?: number;
      bankAccountId?: string;
    }
  ): Promise<Result<Map<string, MatchSuggestion[]>, BaseError>> {
    // Get all unmatched invoices
    const unmatchedResult = await this.invoiceRepository.findUnmatched();
    if (unmatchedResult.isFail()) {
      return Result.fail(unmatchedResult.error);
    }

    const unmatchedInvoices = unmatchedResult.value;

    const suggestions = new Map<string, MatchSuggestion[]>();

    // Process each invoice
    for (const invoice of unmatchedInvoices) {
      const invoiceSuggestionsResult = await this.suggestForInvoice(invoice.id, {
        minScore: options?.minScore,
        maxSuggestions: options?.maxSuggestionsPerInvoice,
        bankAccountId: options?.bankAccountId,
      });

      if (invoiceSuggestionsResult.isOk()) {
        const invoiceSuggestions = invoiceSuggestionsResult.value;
        if (invoiceSuggestions.length > 0) {
          suggestions.set(invoice.id, invoiceSuggestions);
        }
      }
    }

    return Result.ok(suggestions);
  }

  /**
   * Get best match for an invoice (highest scoring suggestion)
   *
   * @param invoiceId Invoice ID
   * @returns Best match suggestion or null if no good matches
   */
  async getBestMatch(
    invoiceId: string
  ): Promise<Result<MatchSuggestion | null, BaseError>> {
    const suggestionsResult = await this.suggestForInvoice(invoiceId, {
      minScore: 50, // Require at least medium confidence
      maxSuggestions: 1,
    });

    if (suggestionsResult.isFail()) {
      return Result.fail(suggestionsResult.error);
    }

    const suggestions = suggestionsResult.value;

    if (suggestions.length === 0) {
      return Result.ok(null);
    }

    return Result.ok(suggestions[0]);
  }

  /**
   * Get auto-matchable suggestions (high confidence >= 90)
   *
   * Returns invoices that can be automatically matched without user review.
   */
  async getAutoMatchable(): Promise<Result<MatchSuggestion[], BaseError>> {
    const allSuggestionsResult = await this.suggestForAllUnmatched({
      minScore: 90, // High confidence only
      maxSuggestionsPerInvoice: 1, // Only best match per invoice
    });

    if (allSuggestionsResult.isFail()) {
      return Result.fail(allSuggestionsResult.error);
    }

    const suggestionsByInvoice = allSuggestionsResult.value;

    // Flatten to single array
    const autoMatchable: MatchSuggestion[] = [];
    for (const suggestions of suggestionsByInvoice.values()) {
      autoMatchable.push(...suggestions);
    }

    return Result.ok(autoMatchable);
  }

  // ==================== Private Helper Methods ====================

  /**
   * Find candidate transactions for matching
   */
  private async findCandidateTransactions(
    invoice: Invoice,
    options?: { bankAccountId?: string }
  ): Promise<Result<BankTransaction[], BaseError>> {
    // Calculate date range (invoice date ±7 days)
    const referenceDate = invoice.issueDate || invoice.createdAt;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - SuggestInvoiceMatchesUseCase.DATE_TOLERANCE_DAYS);

    const endDate = new Date(referenceDate);
    endDate.setDate(endDate.getDate() + SuggestInvoiceMatchesUseCase.DATE_TOLERANCE_DAYS);

    // Calculate amount range (invoice total ±5%)
    const amountTolerance =
      invoice.total * SuggestInvoiceMatchesUseCase.AMOUNT_TOLERANCE_PERCENT;
    const minAmount = -(invoice.total + amountTolerance); // Negative because expenses
    const maxAmount = -(invoice.total - amountTolerance);

    // Find unmatched transactions in date/amount range
    // Note: This is a simplified query - in production, you'd want a dedicated repository method

    // For now, get all unreconciled transactions and filter manually
    // TODO: Add optimized query to IBankTransactionRepository
    const transactionsResult = options?.bankAccountId
      ? await this.transactionRepository.findByBankAccountId(options.bankAccountId, {
          startDate,
          endDate,
        })
      : await this.transactionRepository.findUnreconciled('user-id-placeholder'); // TODO: Get from context

    if (transactionsResult.isFail()) {
      return Result.fail(transactionsResult.error);
    }

    const transactions = transactionsResult.value;

    // Filter by amount range and ensure negative (expense)
    const candidates = transactions.filter(
      (t) => t.amount < 0 && t.amount >= minAmount && t.amount <= maxAmount
    );

    return Result.ok(candidates);
  }

  /**
   * Score and rank candidates using Invoice.calculateMatchScore()
   */
  private scoreAndRankCandidates(
    invoice: Invoice,
    candidates: BankTransaction[]
  ): MatchSuggestion[] {
    const suggestions: MatchSuggestion[] = [];

    for (const transaction of candidates) {
      // Use Invoice entity's matching algorithm
      const matchScore = invoice.calculateMatchScore(
        Math.abs(transaction.amount), // Convert to positive for comparison
        transaction.executionDate,
        transaction.description,
        transaction.counterPartyName
      );

      // Determine confidence level
      let matchConfidence: MatchConfidence;
      if (matchScore >= 90) {
        matchConfidence = MatchConfidence.HIGH;
      } else if (matchScore >= 50) {
        matchConfidence = MatchConfidence.MEDIUM;
      } else {
        matchConfidence = MatchConfidence.LOW;
      }

      // Determine suggested action
      let suggestedAction: 'auto-match' | 'suggest' | 'manual-review';
      if (matchScore >= 90) {
        suggestedAction = 'auto-match';
      } else if (matchScore >= 50) {
        suggestedAction = 'suggest';
      } else {
        suggestedAction = 'manual-review';
      }

      // Calculate score breakdown (simplified - actual breakdown would need Invoice method exposure)
      const scoreBreakdown = this.calculateScoreBreakdown(
        invoice,
        transaction,
        matchScore
      );

      suggestions.push({
        invoice,
        transaction,
        matchScore,
        matchConfidence,
        scoreBreakdown,
        suggestedAction,
      });
    }

    // Sort by score (highest first)
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return suggestions;
  }

  /**
   * Calculate detailed score breakdown
   *
   * This approximates the breakdown since Invoice.calculateMatchScore()
   * doesn't expose individual component scores. In production, you might
   * want to expose this from the Invoice entity.
   */
  private calculateScoreBreakdown(
    invoice: Invoice,
    transaction: BankTransaction,
    totalScore: number
  ): MatchSuggestion['scoreBreakdown'] {
    const transactionAmount = Math.abs(transaction.amount);

    // Amount match (50 points max)
    let amountMatch = 0;
    if (Math.abs(transactionAmount - invoice.total) < 0.01) {
      amountMatch = 50;
    } else if (Math.abs(transactionAmount - invoice.total) <= 1) {
      amountMatch = 40;
    }

    // Date match (20 points max)
    let dateMatch = 0;
    if (invoice.issueDate) {
      const daysDiff = Math.abs(
        (transaction.executionDate.getTime() - invoice.issueDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 0) dateMatch = 20;
      else if (daysDiff <= 3) dateMatch = 15;
      else if (daysDiff <= 7) dateMatch = 10;
    }

    // Vendor match (25 points max) - approximate
    let vendorMatch = 0;
    // This would require vendor name lookup - simplified for now

    // Invoice number match (30 points max)
    let invoiceNumberMatch = 0;
    if (
      invoice.invoiceNumber &&
      transaction.description.toLowerCase().includes(invoice.invoiceNumber.toLowerCase())
    ) {
      invoiceNumberMatch = 30;
    }

    // Reference match (10 bonus points)
    let referenceMatch = 0;
    if (
      invoice.paymentReference &&
      transaction.description.includes(invoice.paymentReference)
    ) {
      referenceMatch = 10;
    }

    return {
      amountMatch,
      dateMatch,
      vendorMatch,
      invoiceNumberMatch,
      referenceMatch,
    };
  }
}
