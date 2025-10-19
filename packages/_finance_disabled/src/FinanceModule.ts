import { Router } from 'express';
import {
  IModule,
  ModuleContext,
  EventHandlerMap,
  ModuleHealth,
} from '@lifeos/core/module-system';
import { DomainEvent } from '@lifeos/core/events';
import { PrismaClient } from '@prisma/client';
import { IEventBus } from '@lifeos/core/events';
import { createInvoiceRoutes } from './presentation/routes/invoiceRoutes';
import { createTransactionRoutes } from './presentation/routes/transactionRoutes';
import { createMatchRoutes } from './presentation/routes/matchRoutes';
import { createWebhookRoutes } from './presentation/routes/webhookRoutes';

/**
 * Finance Module
 *
 * Implements IModule interface for LifeOS module system.
 * Provides invoice management, transaction import, and smart matching.
 *
 * Features:
 * - Invoice upload and AI-powered extraction (Gemini Flash)
 * - Belgian bank transaction import (CSV)
 * - Intelligent invoice-transaction matching
 * - Email automation via Mailgun webhook (optional)
 * - Background job processing (optional)
 *
 * Dependencies:
 * - Prisma: Database access
 * - EventBus: Domain event publishing
 * - JobQueue: Background processing (optional)
 * - Gemini API: Invoice extraction (optional)
 */
export class FinanceModule implements IModule {
  public readonly name = 'finance';
  public readonly version = '1.0.0';
  public readonly description =
    'Invoice and transaction management with AI-powered extraction and smart matching';

  private prisma?: PrismaClient;
  private eventBus?: IEventBus;
  private router?: Router;
  private context?: ModuleContext;

  /**
   * Initialize module
   *
   * Called once when module is loaded.
   * Sets up routes, subscribes to events, and initializes background workers.
   */
  async initialize(context: ModuleContext): Promise<void> {
    console.log(`  🏦 Initializing Finance module...`);

    this.context = context;
    this.prisma = context.prisma;
    this.eventBus = context.eventBus;

    // Create routes
    this.router = Router();

    // Mount invoice routes
    const invoiceRouter = createInvoiceRoutes(
      context.prisma,
      context.eventBus,
      context.config.geminiApiKey,
      context.storagePath
    );
    this.router.use('/invoices', invoiceRouter);

    // Mount transaction routes
    const transactionRouter = createTransactionRoutes(context.prisma, context.eventBus);
    this.router.use('/transactions', transactionRouter);

    // Mount match routes
    const matchRouter = createMatchRoutes(context.prisma, context.eventBus);
    this.router.use('/matches', matchRouter);

    // Mount webhook routes
    const webhookRouter = createWebhookRoutes(
      context.prisma,
      context.eventBus,
      context.config.geminiApiKey,
      context.storagePath,
      context.config.mailgunSigningKey
    );
    this.router.use('/webhooks', webhookRouter);

    // TODO: Register background jobs when job queue is ready
    // if (context.jobQueue) {
    //   await this.registerBackgroundJobs(context.jobQueue);
    // }

    console.log(`  ✅ Finance module initialized`);
  }

  /**
   * Shutdown module
   *
   * Called when application is shutting down.
   * Cleans up resources and connections.
   */
  async shutdown(): Promise<void> {
    console.log(`  🏦 Shutting down Finance module...`);

    // Nothing to clean up yet
    // TODO: Stop background workers if any

    console.log(`  ✅ Finance module shut down`);
  }

  /**
   * Get module routes
   *
   * Returns Express router with all Finance module endpoints.
   * Routes will be mounted at /api/finance
   */
  getRoutes(): Router | null {
    return this.router || null;
  }

  /**
   * Get event handlers
   *
   * Returns map of event types to handler functions.
   * Finance module can react to events from other modules.
   */
  getEventHandlers(): EventHandlerMap | null {
    return {
      // React to user creation (auto-create finance account)
      UserCreated: this.handleUserCreated.bind(this),

      // React to bank account connection (auto-sync transactions)
      BankAccountConnected: this.handleBankAccountConnected.bind(this),

      // React to month-end trigger (generate reports)
      MonthEndTriggered: this.handleMonthEnd.bind(this),
    };
  }

  /**
   * Health check
   *
   * Returns module health status for monitoring.
   */
  async healthCheck(): Promise<ModuleHealth> {
    const checks: ModuleHealth['checks'] = {};

    // Check database connection
    try {
      const start = Date.now();
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
      }
      checks.database = {
        status: 'pass',
        latency: Date.now() - start,
      };
    } catch (error) {
      checks.database = {
        status: 'fail',
        message: 'Database connection failed',
      };
    }

    // Check file storage
    try {
      const fs = await import('fs/promises');
      const storagePath = this.context?.storagePath || './data';
      await fs.access(storagePath);
      checks.storage = {
        status: 'pass',
        message: `Storage accessible at ${storagePath}`,
      };
    } catch (error) {
      checks.storage = {
        status: 'warn',
        message: 'Storage directory not accessible',
      };
    }

    // Check Gemini API configuration
    if (this.context?.config.geminiApiKey) {
      checks.gemini_api = {
        status: 'pass',
        message: 'Gemini API key configured',
      };
    } else {
      checks.gemini_api = {
        status: 'warn',
        message: 'Gemini API key not configured (invoice extraction disabled)',
      };
    }

    // Determine overall status
    const hasFailures = Object.values(checks).some((c) => c.status === 'fail');
    const hasWarnings = Object.values(checks).some((c) => c.status === 'warn');

    return {
      module: this.name,
      status: hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy',
      timestamp: new Date(),
      checks,
      metadata: {
        version: this.version,
        features: {
          invoice_management: true,
          transaction_import: true,
          smart_matching: true,
          email_automation: !!this.context?.config.mailgunSigningKey,
          ai_extraction: !!this.context?.config.geminiApiKey,
        },
      },
    };
  }

  /**
   * Handle UserCreated event
   *
   * Auto-create finance records for new users.
   */
  private async handleUserCreated(event: DomainEvent): Promise<void> {
    console.log(`Finance module handling UserCreated event:`, event.payload);
    // TODO: Create finance account/setup for new user
  }

  /**
   * Handle BankAccountConnected event
   *
   * Start automatic transaction sync.
   */
  private async handleBankAccountConnected(event: DomainEvent): Promise<void> {
    console.log(`Finance module handling BankAccountConnected event:`, event.payload);
    // TODO: Trigger transaction import/sync
  }

  /**
   * Handle MonthEndTriggered event
   *
   * Generate monthly reports and reconciliation.
   */
  private async handleMonthEnd(event: DomainEvent): Promise<void> {
    console.log(`Finance module handling MonthEndTriggered event:`, event.payload);
    // TODO: Generate monthly reports
    // TODO: Mark overdue invoices
    // TODO: Send reconciliation summary
  }

  /**
   * Register background jobs
   *
   * Sets up job handlers for async processing.
   */
  private async registerBackgroundJobs(jobQueue: any): Promise<void> {
    // TODO: Process invoice emails
    // await jobQueue.process('finance', 'process-invoice-email', async (job) => {
    //   // Handle email processing
    // });

    // TODO: Extract invoice data
    // await jobQueue.process('finance', 'extract-invoice-data', async (job) => {
    //   // Handle AI extraction
    // });

    // TODO: Auto-match invoices
    // await jobQueue.process('finance', 'auto-match-invoices', async (job) => {
    //   // Handle auto-matching
    // });

    console.log(`  📋 Registered Finance background jobs`);
  }
}

// Export default for module loader
export default FinanceModule;
