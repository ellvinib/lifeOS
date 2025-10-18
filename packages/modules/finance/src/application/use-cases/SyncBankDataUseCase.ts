/**
 * SyncBankDataUseCase
 *
 * Syncs bank accounts and transactions from Ibanity.
 * Handles token refresh if needed.
 *
 * Use Case Pattern:
 * 1. Get connection and validate
 * 2. Refresh token if needed
 * 3. Fetch accounts from Ibanity
 * 4. Fetch transactions for each account
 * 5. Save to database
 * 6. Publish sync completed event
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IBankConnectionRepository } from '../../domain/interfaces/IBankConnectionRepository';
import { IBankAccountRepository } from '../../domain/interfaces/IBankAccountRepository';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';
import { IIbanityService } from '../../domain/interfaces/IIbanityService';
import { IEncryptionService } from '../../domain/interfaces/IEncryptionService';
import { BankConnection } from '../../domain/entities/BankConnection';
import { BankAccount } from '../../domain/entities/BankAccount';
import { BankTransaction } from '../../domain/entities/BankTransaction';

/**
 * Sync Input
 */
export interface SyncBankDataInput {
  connectionId: string;
  syncTransactionsDays?: number; // How many days back to sync (default: 90)
}

/**
 * Sync Result
 */
export interface SyncBankDataResult {
  accountsSynced: number;
  transactionsSynced: number;
  syncedAt: Date;
}

/**
 * Sync Bank Data Use Case
 *
 * Synchronizes accounts and transactions from Ibanity.
 *
 * Business Rules:
 * - Connection must be active
 * - Token must be valid (refreshed if needed)
 * - Only sync enabled accounts
 * - Don't duplicate existing transactions
 * - Update last sync timestamp
 */
export class SyncBankDataUseCase {
  constructor(
    private readonly bankConnectionRepository: IBankConnectionRepository,
    private readonly bankAccountRepository: IBankAccountRepository,
    private readonly bankTransactionRepository: IBankTransactionRepository,
    private readonly ibanityService: IIbanityService,
    private readonly encryptionService: IEncryptionService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: SyncBankDataInput): Promise<Result<SyncBankDataResult, BaseError>> {
    const syncTransactionsDays = input.syncTransactionsDays || 90;

    // Step 1: Get connection and validate
    const connectionResult = await this.bankConnectionRepository.findById(input.connectionId);
    if (connectionResult.isFail()) {
      return connectionResult;
    }

    const connection = connectionResult.value;

    if (!connection.canSync()) {
      return Result.fail(
        new BusinessRuleError(
          'Connection cannot sync. It may be expired or revoked.',
          'CONNECTION_NOT_ACTIVE'
        )
      );
    }

    // Step 2: Refresh token if needed
    let accessToken: string;
    try {
      if (connection.needsRefresh()) {
        const refreshResult = await this.refreshToken(connection);
        if (refreshResult.isFail()) {
          return refreshResult;
        }
        accessToken = refreshResult.value;
      } else {
        accessToken = this.encryptionService.decrypt(connection.encryptedAccessToken);
      }
    } catch (error) {
      return Result.fail(
        new BaseError(
          'DECRYPTION_FAILED',
          `Failed to decrypt access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }

    // Step 3: Fetch accounts from Ibanity
    const accountsResult = await this.ibanityService.getAccounts(
      accessToken,
      connection.provider
    );

    if (accountsResult.isFail()) {
      return accountsResult;
    }

    const ibanityAccounts = accountsResult.value;
    let accountsSynced = 0;
    let transactionsSynced = 0;

    // Step 4 & 5: Save accounts and fetch transactions
    for (const ibanityAccount of ibanityAccounts) {
      // Check if account already exists
      const existingAccountResult = await this.bankAccountRepository.findByExternalId(
        connection.id,
        ibanityAccount.id
      );

      if (existingAccountResult.isFail()) {
        continue; // Skip this account on error
      }

      let account: BankAccount;

      if (existingAccountResult.value) {
        // Update existing account
        account = existingAccountResult.value;
        account.updateBalance(
          ibanityAccount.currentBalance,
          ibanityAccount.availableBalance
        );
      } else {
        // Create new account
        account = BankAccount.create(
          connection.id,
          ibanityAccount.id,
          ibanityAccount.currency,
          {
            iban: ibanityAccount.iban,
            accountHolderName: ibanityAccount.holderName,
            accountName: ibanityAccount.description,
            currentBalance: ibanityAccount.currentBalance,
            availableBalance: ibanityAccount.availableBalance,
            institutionName: ibanityAccount.institution,
          }
        );
      }

      // Save account
      const saveAccountResult = await this.bankAccountRepository.save(account);
      if (saveAccountResult.isFail()) {
        continue; // Skip this account on error
      }

      accountsSynced++;

      // Only sync transactions for enabled accounts
      if (!account.syncEnabled) {
        continue;
      }

      // Fetch transactions for this account
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - syncTransactionsDays);

      const transactionsResult = await this.ibanityService.getTransactions(
        accessToken,
        ibanityAccount.id,
        fromDate,
        toDate,
        connection.provider
      );

      if (transactionsResult.isFail()) {
        continue; // Skip transactions on error
      }

      const ibanityTransactions = transactionsResult.value;
      const transactionsToSave: BankTransaction[] = [];

      for (const ibanityTx of ibanityTransactions) {
        // Check if transaction already exists
        const existingTxResult = await this.bankTransactionRepository.findByExternalId(
          account.id,
          ibanityTx.id
        );

        if (existingTxResult.isFail() || existingTxResult.value) {
          continue; // Skip if error or already exists
        }

        // Create new transaction
        const transaction = BankTransaction.create(
          account.id,
          ibanityTx.id,
          ibanityTx.amount,
          ibanityTx.currency,
          ibanityTx.description,
          ibanityTx.executionDate,
          {
            counterPartyName: ibanityTx.counterpartyName,
            counterPartyIban: ibanityTx.counterpartyReference,
            valueDate: ibanityTx.valueDate,
          }
        );

        transactionsToSave.push(transaction);
      }

      // Bulk save transactions
      if (transactionsToSave.length > 0) {
        const saveTxResult = await this.bankTransactionRepository.saveMany(
          transactionsToSave
        );
        if (saveTxResult.isOk()) {
          transactionsSynced += transactionsToSave.length;
        }
      }
    }

    // Step 6: Update last sync timestamp
    const syncTime = new Date();
    await this.bankConnectionRepository.updateLastSync(connection.id, syncTime);

    // Step 7: Publish sync completed event
    await this.eventBus.publish({
      type: 'BankDataSynced',
      source: 'finance',
      payload: {
        connectionId: connection.id,
        accountsSynced,
        transactionsSynced,
        syncedAt: syncTime,
      },
      metadata: {
        userId: connection.userId,
        timestamp: new Date(),
      },
    });

    return Result.ok({
      accountsSynced,
      transactionsSynced,
      syncedAt: syncTime,
    });
  }

  /**
   * Refresh access token
   */
  private async refreshToken(connection: BankConnection): Promise<Result<string, BaseError>> {
    try {
      const refreshToken = this.encryptionService.decrypt(connection.encryptedRefreshToken);

      const tokenResult = await this.ibanityService.refreshAccessToken(
        refreshToken,
        connection.provider
      );

      if (tokenResult.isFail()) {
        return tokenResult;
      }

      const tokens = tokenResult.value;

      // Encrypt new tokens
      const encryptedAccessToken = this.encryptionService.encrypt(tokens.accessToken);
      const encryptedRefreshToken = this.encryptionService.encrypt(tokens.refreshToken);

      // Update connection
      connection.updateTokens(
        encryptedAccessToken,
        encryptedRefreshToken,
        tokens.expiresAt
      );

      await this.bankConnectionRepository.save(connection);

      return Result.ok(tokens.accessToken);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'TOKEN_REFRESH_FAILED',
          `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }
  }
}
