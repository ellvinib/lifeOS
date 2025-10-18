import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import {
  BankConnectionRepository,
  BankAccountRepository,
  BankTransactionRepository,
} from '../../../../../modules/finance/src/infrastructure/repositories';
import { EncryptionService, createIbanityApiService } from '../../../../../modules/finance/src/infrastructure/services';
import { SyncBankDataUseCase } from '../../../../../modules/finance/src/application/use-cases';

/**
 * Sync Bank Transactions Job Data
 */
export interface SyncBankTransactionsJobData {
  userId: string;
  connectionId?: string; // If specified, only sync this connection
}

/**
 * Sync Bank Transactions Job Processor
 *
 * Processes background jobs for syncing bank transactions from Ibanity.
 * Runs every 4 hours or triggered manually.
 */
export class SyncBankTransactionsProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Process sync bank transactions job
   */
  async process(job: Job<SyncBankTransactionsJobData>): Promise<void> {
    const { userId, connectionId } = job.data;

    console.log(`[SyncBankTransactions] Processing job for user ${userId}`);

    try {
      // Initialize dependencies
      const bankConnectionRepository = new BankConnectionRepository(this.prisma);
      const bankAccountRepository = new BankAccountRepository(this.prisma);
      const bankTransactionRepository = new BankTransactionRepository(this.prisma);

      const encryptionKey =
        process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
      const encryptionService = new EncryptionService(encryptionKey);
      const ibanityService = createIbanityApiService();

      const useCase = new SyncBankDataUseCase(
        bankConnectionRepository,
        bankAccountRepository,
        bankTransactionRepository,
        ibanityService,
        encryptionService,
        this.eventBus
      );

      // Get active connections for user
      const connectionsResult = await bankConnectionRepository.findActiveByUserId(userId);

      if (connectionsResult.isFail()) {
        throw new Error(`Failed to get connections: ${connectionsResult.error.message}`);
      }

      let connections = connectionsResult.value;

      // Filter to specific connection if specified
      if (connectionId) {
        connections = connections.filter((c) => c.id === connectionId);
      }

      if (connections.length === 0) {
        console.log(`[SyncBankTransactions] No active connections found for user ${userId}`);
        return;
      }

      console.log(
        `[SyncBankTransactions] Found ${connections.length} connections to sync`
      );

      // Sync each connection
      let synced = 0;
      for (const connection of connections) {
        try {
          const result = await useCase.execute({
            userId,
            connectionId: connection.id,
          });

          if (result.isFail()) {
            console.error(
              `[SyncBankTransactions] Failed to sync connection ${connection.id}:`,
              result.error.message
            );
            // Continue with other connections
            continue;
          }

          console.log(
            `[SyncBankTransactions] Synced ${result.value.accountsSynced} accounts, ${result.value.transactionsSynced} transactions for connection ${connection.id}`
          );

          synced++;
          await job.updateProgress((synced / connections.length) * 100);
        } catch (error: any) {
          console.error(
            `[SyncBankTransactions] Error syncing connection ${connection.id}:`,
            error
          );
          // Continue with other connections
        }
      }

      console.log(
        `[SyncBankTransactions] Completed. Synced ${synced}/${connections.length} connections`
      );
    } catch (error: any) {
      console.error(`[SyncBankTransactions] Error processing job:`, error);
      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Sync transactions for all active users
   */
  async processAllUsers(job: Job): Promise<void> {
    console.log('[SyncBankTransactions] Processing sync for all users');

    try {
      // Get all users with active bank connections
      const users = await this.prisma.user.findMany({
        where: {
          bankConnections: {
            some: {
              status: 'connected',
            },
          },
        },
        select: {
          id: true,
        },
      });

      console.log(`[SyncBankTransactions] Found ${users.length} users to process`);

      // Process each user
      let processed = 0;
      for (const user of users) {
        try {
          await this.process({
            data: {
              userId: user.id,
            },
          } as Job<SyncBankTransactionsJobData>);

          processed++;
          await job.updateProgress((processed / users.length) * 100);
        } catch (error: any) {
          console.error(
            `[SyncBankTransactions] Failed to process user ${user.id}:`,
            error
          );
          // Continue with other users
        }
      }

      console.log(
        `[SyncBankTransactions] Completed. Processed ${processed}/${users.length} users`
      );
    } catch (error: any) {
      console.error('[SyncBankTransactions] Error processing all users:', error);
      throw error;
    }
  }
}
