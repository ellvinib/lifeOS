/**
 * Bank Integration Enumerations
 *
 * Enums for bank connection, account, and transaction management
 */

/**
 * Supported bank providers
 */
export enum BankProvider {
  PONTO = 'ponto',
  ISABEL = 'isabel',
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

/**
 * Reconciliation status for bank transactions
 */
export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  IGNORED = 'ignored',
}
