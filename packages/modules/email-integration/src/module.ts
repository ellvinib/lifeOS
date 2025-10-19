import { Router } from 'express';
import { IModule, ModuleContext, EventHandlerMap, ModuleHealth } from '@lifeos/core/module-system';
import { routes } from './presentation/routes';

/**
 * Email Integration Module
 *
 * Provides email account management and synchronization for Gmail, Outlook, and SMTP.
 *
 * Features:
 * - Connect email accounts (OAuth for Gmail/Outlook, credentials for SMTP)
 * - Real-time email synchronization via webhooks
 * - Email metadata storage and search
 * - Background sync jobs
 */
export class EmailIntegrationModule implements IModule {
  readonly name = 'email';
  readonly version = '1.0.0';
  readonly description = 'Email account integration and synchronization';

  private context?: ModuleContext;
  private router?: Router;

  /**
   * Initialize module
   */
  async initialize(context: ModuleContext): Promise<void> {
    console.log(`[EmailModule] Initializing...`);

    this.context = context;

    // Set up routes
    this.router = routes(context);

    console.log(`[EmailModule] ✅ Initialized successfully`);
  }

  /**
   * Shutdown module
   */
  async shutdown(): Promise<void> {
    console.log(`[EmailModule] Shutting down...`);
    // Clean up resources if needed
    console.log(`[EmailModule] ✅ Shut down successfully`);
  }

  /**
   * Get module routes
   */
  getRoutes(): Router | null {
    return this.router || null;
  }

  /**
   * Get event handlers
   */
  getEventHandlers(): EventHandlerMap | null {
    // TODO: Add event handlers for email-related events
    return null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ModuleHealth> {
    const checks: ModuleHealth['checks'] = {
      database: {
        status: 'pass',
        message: 'Database connection healthy',
      },
    };

    // Check if we can connect to database
    try {
      if (this.context?.prisma) {
        await this.context.prisma.$queryRaw`SELECT 1`;
        checks.database.status = 'pass';
      }
    } catch (error) {
      checks.database.status = 'fail';
      checks.database.message = 'Database connection failed';
    }

    const allPassing = Object.values(checks).every(c => c.status === 'pass');
    const anyFailing = Object.values(checks).some(c => c.status === 'fail');

    return {
      module: this.name,
      status: anyFailing ? 'unhealthy' : allPassing ? 'healthy' : 'degraded',
      timestamp: new Date(),
      checks,
    };
  }
}

// Export module class as default
export default EmailIntegrationModule;
