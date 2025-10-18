/**
 * BankAccountDTO
 *
 * Data Transfer Objects for bank accounts.
 */

import { BankAccount } from '../../domain/entities/BankAccount';

/**
 * Bank Account Response DTO
 *
 * Used for returning account data via API
 */
export interface BankAccountResponseDTO {
  id: string;
  connectionId: string;
  iban?: string;
  accountHolderName?: string;
  accountName?: string;
  displayName: string; // Computed display name
  currency: string;
  currentBalance?: number;
  availableBalance?: number;
  institutionName?: string;
  syncEnabled: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Bank Account List Query Parameters
 */
export interface BankAccountQueryDTO {
  connectionId?: string;
  syncEnabled?: boolean;
}

/**
 * Toggle Sync Request DTO
 */
export interface ToggleSyncRequestDTO {
  syncEnabled: boolean;
}

/**
 * BankAccount DTO Mapper
 *
 * Maps between domain entities and DTOs
 */
export class BankAccountDTOMapper {
  /**
   * Convert domain entity to response DTO
   */
  public static toResponseDTO(account: BankAccount): BankAccountResponseDTO {
    return {
      id: account.id,
      connectionId: account.connectionId,
      iban: account.iban,
      accountHolderName: account.accountHolderName,
      accountName: account.accountName,
      displayName: account.getDisplayName(), // Use domain method
      currency: account.currency,
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      institutionName: account.institutionName,
      syncEnabled: account.syncEnabled,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  /**
   * Convert array of domain entities to response DTOs
   */
  public static toResponseDTOs(accounts: BankAccount[]): BankAccountResponseDTO[] {
    return accounts.map(a => this.toResponseDTO(a));
  }
}
