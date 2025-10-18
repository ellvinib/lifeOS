import { Email } from '../../domain/entities/Email';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';

/**
 * Email Response DTO
 *
 * Data Transfer Object for Email API responses.
 * Contains metadata only - full content fetched on-demand.
 */
export interface EmailDTO {
  id: string;
  accountId: string;
  providerMessageId: string;
  provider: EmailProvider;
  from: {
    address: string;
    name: string | null;
  };
  to: Array<{
    address: string;
    name: string | null;
  }>;
  subject: string;
  snippet: string;
  hasAttachments: boolean;
  timestamp: string; // ISO 8601 string
  labels: string[];
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

/**
 * Email List Response DTO
 *
 * Paginated list of emails with metadata
 */
export interface EmailListResponseDTO {
  emails: EmailDTO[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Email Search Filters DTO
 *
 * Query parameters for email search
 */
export interface EmailSearchFiltersDTO {
  from?: string; // Email address or domain
  subject?: string; // Keyword in subject
  hasAttachments?: boolean;
  labels?: string[];
  since?: string; // ISO 8601 date string
  until?: string; // ISO 8601 date string
  limit?: number;
  offset?: number;
}

/**
 * Email Mapper
 *
 * Maps between Email domain entities and DTOs.
 *
 * Design Pattern: Data Mapper
 * - Separates API layer from domain layer
 * - Converts dates to ISO 8601 strings
 * - Flattens nested value objects
 */
export class EmailMapper {
  /**
   * Map domain entity to response DTO
   */
  static toResponseDTO(email: Email): EmailDTO {
    return {
      id: email.id,
      accountId: email.accountId,
      providerMessageId: email.providerMessageId,
      provider: email.provider,
      from: {
        address: email.from.address,
        name: email.from.name,
      },
      to: email.to.map((recipient) => ({
        address: recipient.address,
        name: recipient.name,
      })),
      subject: email.subject,
      snippet: email.snippet,
      hasAttachments: email.hasAttachmentsFlag,
      timestamp: email.timestamp.toISOString(),
      labels: email.labels,
      createdAt: email.createdAt.toISOString(),
      updatedAt: email.updatedAt.toISOString(),
    };
  }

  /**
   * Map array of domain entities to response DTOs
   */
  static toResponseDTOList(emails: Email[]): EmailDTO[] {
    return emails.map((email) => this.toResponseDTO(email));
  }

  /**
   * Map to paginated list response DTO
   */
  static toPaginatedResponseDTO(
    emails: Email[],
    total: number,
    limit: number,
    offset: number
  ): EmailListResponseDTO {
    return {
      emails: this.toResponseDTOList(emails),
      total,
      limit,
      offset,
    };
  }
}
