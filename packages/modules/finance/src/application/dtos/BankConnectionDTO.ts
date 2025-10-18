/**
 * BankConnectionDTO
 *
 * Data Transfer Objects for bank connections (OAuth integrations).
 */

import { BankConnection } from '../../domain/entities/BankConnection';
import { BankProvider, ConnectionStatus } from '../../domain/value-objects/BankEnums';

/**
 * Bank Connection Response DTO
 *
 * Used for returning connection data via API.
 * Note: Encrypted tokens are NEVER exposed via API.
 */
export interface BankConnectionResponseDTO {
  id: string;
  provider: BankProvider;
  status: ConnectionStatus;
  lastSyncAt?: string; // ISO 8601 format
  tokenExpiresAt: string; // ISO 8601 format
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Complete Connection Request DTO
 *
 * Used after OAuth callback to complete connection
 */
export interface CompleteConnectionRequestDTO {
  provider: BankProvider;
  authCode: string;
}

/**
 * Get Authorization URL Request DTO
 */
export interface GetAuthUrlRequestDTO {
  provider: BankProvider;
}

/**
 * Get Authorization URL Response DTO
 */
export interface GetAuthUrlResponseDTO {
  authUrl: string;
  state: string; // CSRF token to validate callback
}

/**
 * BankConnection DTO Mapper
 *
 * Maps between domain entities and DTOs.
 * Security: Encrypted tokens are never included in DTOs.
 */
export class BankConnectionDTOMapper {
  /**
   * Convert domain entity to response DTO
   */
  public static toResponseDTO(connection: BankConnection): BankConnectionResponseDTO {
    return {
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt?.toISOString(),
      tokenExpiresAt: connection.tokenExpiresAt.toISOString(),
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }

  /**
   * Convert array of domain entities to response DTOs
   */
  public static toResponseDTOs(connections: BankConnection[]): BankConnectionResponseDTO[] {
    return connections.map(c => this.toResponseDTO(c));
  }
}
