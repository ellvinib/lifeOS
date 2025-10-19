import { InvoiceTransactionMatch, MatchConfidence } from '../../domain/entities';

/**
 * Invoice-Transaction Match DTO
 *
 * Represents a match relationship between invoice and bank transaction.
 */
export interface MatchDTO {
  id: string;
  invoiceId: string;
  transactionId: string;
  matchConfidence: MatchConfidence;
  matchScore: number; // 0-100
  matchedBy: 'system' | 'user';
  matchedByUserId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  matchedAt: string; // ISO 8601 datetime string
  createdAt: string;
}

/**
 * Create Match DTO (for manual matching)
 */
export interface CreateMatchDTO {
  invoiceId: string;
  transactionId: string;
  notes?: string;
}

/**
 * Match Suggestion DTO
 *
 * Represents an AI-suggested match with scoring details.
 */
export interface MatchSuggestionDTO {
  invoice: {
    id: string;
    invoiceNumber?: string;
    vendorName?: string;
    total: number;
    issueDate?: string;
    dueDate?: string;
  };
  transaction: {
    id: string;
    date: string;
    amount: number;
    description?: string;
    counterparty?: string;
  };
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
 * Match Statistics DTO
 */
export interface MatchStatisticsDTO {
  totalMatches: number;
  autoMatches: number;
  manualMatches: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  needingReview: number;
}

/**
 * Match List DTO
 */
export interface MatchListDTO {
  matches: MatchDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Match Filter DTO
 */
export interface MatchFilterDTO {
  invoiceId?: string;
  transactionId?: string;
  matchConfidence?: MatchConfidence;
  matchedBy?: 'system' | 'user';
  matchedByUserId?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string; // ISO 8601 date string
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'matchedAt' | 'matchScore';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Match DTO Mapper
 */
export class MatchDTOMapper {
  /**
   * Map domain entity to DTO
   */
  public static toDTO(match: InvoiceTransactionMatch): MatchDTO {
    return {
      id: match.id,
      invoiceId: match.invoiceId,
      transactionId: match.transactionId,
      matchConfidence: match.matchConfidence,
      matchScore: match.matchScore,
      matchedBy: match.matchedBy,
      matchedByUserId: match.matchedByUserId,
      notes: match.notes,
      metadata: match.metadata,
      matchedAt: match.matchedAt.toISOString(),
      createdAt: match.createdAt.toISOString(),
    };
  }

  /**
   * Map array of domain entities to DTOs
   */
  public static toDTOArray(matches: InvoiceTransactionMatch[]): MatchDTO[] {
    return matches.map((match) => this.toDTO(match));
  }

  /**
   * Create paginated list DTO
   */
  public static toListDTO(
    matches: InvoiceTransactionMatch[],
    page: number,
    limit: number,
    total: number
  ): MatchListDTO {
    return {
      matches: this.toDTOArray(matches),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Parse date string to Date object
   */
  public static parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    return new Date(dateString);
  }

  /**
   * Map MatchFilterDTO to domain query options
   */
  public static fromFilterDTO(dto: MatchFilterDTO) {
    return {
      invoiceId: dto.invoiceId,
      transactionId: dto.transactionId,
      matchConfidence: dto.matchConfidence,
      matchedBy: dto.matchedBy,
      matchedByUserId: dto.matchedByUserId,
      minScore: dto.minScore,
      maxScore: dto.maxScore,
      dateFrom: this.parseDate(dto.dateFrom),
      dateTo: this.parseDate(dto.dateTo),
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }
}
