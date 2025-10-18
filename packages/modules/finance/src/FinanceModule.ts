import { Router } from 'express';
import {
  IModule,
  ModuleManifest,
  ModuleContext,
  Route,
  ComponentRegistry,
  Migration,
} from '@lifeOS/core/module-system';
import { EventHandler } from '@lifeOS/core/events';
import { PrismaClient } from '@prisma/client';
import { createFinanceRoutes } from './presentation/routes';
import manifest from '../module.json';

/**
 * Finance Module
 *
 * Implements the IModule interface for the Finance domain.
 * Provides personal finance management capabilities including:
 * - Expense tracking with categorization
 * - Budget management with envelope method
 * - Affordability checking (killer feature)
 * - Daily spending focus (TODAY view)
 * - Insurance, loans, bills, and assets tracking
 *
 * Architecture:
 * - Clean architecture with layered design
 * - Repository pattern for data access
 * - Use case pattern for business logic
 * - Event-driven for module communication
 */
export class FinanceModule implements IModule {
  public readonly manifest: ModuleManifest = manifest;

  private context?: ModuleContext;
  private prisma?: PrismaClient;
  private router?: Router;

  /**
   * Initialize the module
   * Sets up event subscriptions and prepares services
   */
  async initialize(context: ModuleContext): Promise<void> {
    this.context = context;

    context.logger.info('Initializing Finance module...');

    // Get database connection from context
    this.prisma = context.database as PrismaClient;
    if (!this.prisma) {
      throw new Error('Finance module requires database access');
    }

    // Create routes with dependency injection
    this.router = createFinanceRoutes(this.prisma, context.eventBus);

    // Subscribe to events this module cares about
    // Currently no subscriptions, but ready for future
    if (this.manifest.events?.subscribes) {
      for (const eventType of this.manifest.events.subscribes) {
        context.eventBus.subscribe(
          eventType,
          this.createEventHandler(eventType),
          10 // priority
        );
        context.logger.debug(`Subscribed to event: ${eventType}`);
      }
    }

    context.logger.info('Finance module initialized successfully');
  }

  /**
   * Shutdown the module gracefully
   */
  async shutdown(): Promise<void> {
    if (this.context) {
      this.context.logger.info('Shutting down Finance module...');

      // Clean up resources here if needed
      // (e.g., close connections, cancel scheduled jobs)

      this.context.logger.info('Finance module shutdown complete');
    }
  }

  /**
   * Get API routes provided by this module
   * These will be mounted at /api/finance
   */
  getRoutes(): Route[] {
    if (!this.router) {
      throw new Error('Module not initialized. Call initialize() first.');
    }

    // Express router will be converted to Route[] by the API server
    // For now, return empty array as the router is accessed directly
    return [];
  }

  /**
   * Get the Express router for this module
   * Used by the API server to mount routes
   */
  getRouter(): Router {
    if (!this.router) {
      throw new Error('Module not initialized. Call initialize() first.');
    }
    return this.router;
  }

  /**
   * Get UI components provided by this module
   */
  getUIComponents(): ComponentRegistry {
    return {
      navigationItems: [
        {
          id: 'finance',
          label: 'Finance',
          icon: 'dollar-sign',
          path: '/finance',
          order: 20,
        },
        {
          id: 'finance-envelopes',
          label: 'Budget Enveloppen',
          icon: 'wallet',
          path: '/finance/envelopes',
          order: 21,
        },
      ],
      widgets: [
        {
          id: 'finance-today',
          component: undefined, // Will be provided by frontend
          defaultSize: { width: 4, height: 2 },
        },
        {
          id: 'finance-envelopes',
          component: undefined,
          defaultSize: { width: 4, height: 3 },
        },
      ],
    };
  }

  /**
   * Get event handlers for this module
   */
  getEventHandlers(): Record<string, EventHandler> {
    return {
      MonthEnded: this.handleMonthEnded.bind(this),
      BillDue: this.handleBillDue.bind(this),
    };
  }

  /**
   * Get database migrations for this module
   * Migrations are handled by Prisma, so we return empty array
   */
  getMigrations(): Migration[] {
    return [];
  }

  /**
   * Health check for this module
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      if (!this.prisma) {
        return { healthy: false, message: 'Database not initialized' };
      }

      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return { healthy: true, message: 'Finance module is healthy' };
    } catch (error: any) {
      return {
        healthy: false,
        message: `Finance module health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Create event handler for a specific event type
   */
  private createEventHandler(eventType: string): EventHandler {
    return async (event) => {
      if (this.context) {
        this.context.logger.debug(`Handling event: ${eventType}`, {
          eventId: event.id,
          timestamp: event.timestamp,
        });
      }

      // Handle event based on type
      switch (eventType) {
        case 'MonthEnded':
          await this.handleMonthEnded(event);
          break;
        case 'BillDue':
          await this.handleBillDue(event);
          break;
        default:
          if (this.context) {
            this.context.logger.warn(`No handler for event type: ${eventType}`);
          }
      }
    };
  }

  /**
   * Handle MonthEnded event
   * Create new budget for next month, calculate previous month's performance
   */
  private async handleMonthEnded(event: any): Promise<void> {
    // TODO: Implement month-end processing
    // - Calculate total spending vs budget
    // - Generate monthly report
    // - Create budget for next month (if configured)
    // - Send notification with summary
    if (this.context) {
      this.context.logger.info('Processing month end...', { event });
    }
  }

  /**
   * Handle BillDue event
   * Send notification about upcoming bill
   */
  private async handleBillDue(event: any): Promise<void> {
    // TODO: Implement bill due notification
    // - Check if bill is already paid
    // - Send notification
    // - Create expense entry if auto-pay enabled
    if (this.context) {
      this.context.logger.info('Processing bill due...', { event });
    }
  }
}
