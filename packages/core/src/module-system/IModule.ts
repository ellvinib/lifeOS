import { Router } from 'express';
import { EventHandler } from '../events/DomainEvent';

/**
 * Module Interface
 *
 * All LifeOS modules must implement this interface.
 * Provides lifecycle hooks, route registration, and event handling.
 *
 * Following principles:
 * - Modules are self-contained units of functionality
 * - Modules communicate via events (loose coupling)
 * - Modules expose REST APIs via routes
 * - Modules manage their own data and migrations
 */
export interface IModule {
  /**
   * Module name (must match module.json)
   * Example: "finance", "garden", "calendar"
   */
  readonly name: string;

  /**
   * Module version (semantic versioning)
   * Example: "1.0.0"
   */
  readonly version: string;

  /**
   * Module description
   */
  readonly description?: string;

  /**
   * Initialize module
   *
   * Called once when the module is loaded.
   * Use this to:
   * - Set up repositories and services
   * - Subscribe to events
   * - Initialize background workers
   * - Validate configuration
   *
   * @param context Module context with dependencies
   * @returns Promise that resolves when initialization is complete
   */
  initialize(context: ModuleContext): Promise<void>;

  /**
   * Shutdown module
   *
   * Called when the application is shutting down.
   * Use this to:
   * - Close database connections
   * - Stop background workers
   * - Clean up resources
   *
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;

  /**
   * Get module routes
   *
   * Returns Express router with all module endpoints.
   * Routes will be mounted at /api/{moduleName}
   *
   * @returns Express router or null if no routes
   */
  getRoutes(): Router | null;

  /**
   * Get event handlers
   *
   * Returns map of event types to handler functions.
   * Module will be automatically subscribed to these events.
   *
   * @returns Event handler map or null if no handlers
   */
  getEventHandlers(): EventHandlerMap | null;

  /**
   * Health check
   *
   * Returns module health status.
   * Used for monitoring and diagnostics.
   *
   * @returns Health status
   */
  healthCheck(): Promise<ModuleHealth>;
}

/**
 * Module Context
 *
 * Provided to modules during initialization.
 * Contains shared dependencies and configuration.
 */
export interface ModuleContext {
  /**
   * Prisma database client
   */
  prisma: any; // PrismaClient

  /**
   * Event bus for publishing/subscribing to events
   */
  eventBus: any; // IEventBus

  /**
   * Job queue for background processing (optional)
   */
  jobQueue?: any; // IJobQueue

  /**
   * Module configuration from environment/config files
   */
  config: Record<string, any>;

  /**
   * Logger instance
   */
  logger?: any; // ILogger

  /**
   * Base path for file storage
   */
  storagePath?: string;

  /**
   * Application environment
   */
  env: 'development' | 'production' | 'test';
}

/**
 * Event Handler Map
 *
 * Maps event types to handler functions.
 * Uses EventHandler from events/DomainEvent.
 */
export type EventHandlerMap = {
  [eventType: string]: EventHandler;
};

/**
 * Module Health Status
 */
export interface ModuleHealth {
  /**
   * Module name
   */
  module: string;

  /**
   * Overall health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Timestamp of health check
   */
  timestamp: Date;

  /**
   * Individual component checks
   */
  checks: {
    [component: string]: {
      status: 'pass' | 'warn' | 'fail';
      message?: string;
      latency?: number;
    };
  };

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Module Metadata
 *
 * Parsed from module.json
 */
export interface ModuleMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  main: string;
  permissions: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  events?: {
    subscribes?: string[];
    publishes?: string[];
  };
  routes?: {
    baseUrl: string;
    endpoints: string[];
  };
  jobs?: Array<{
    name: string;
    description: string;
    schedule: string | null;
    priority: string;
  }>;
  config?: Record<string, any>;
  database?: {
    tables: string[];
    migrations: string;
  };
  features?: Record<string, any>;
  documentation?: Record<string, string>;
  tags?: string[];
}
