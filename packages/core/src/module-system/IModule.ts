import type { DomainEvent, EventHandler } from '../events';

/**
 * Module manifest defining module metadata and dependencies.
 * This should be provided in a module.json file in each module.
 */
export interface ModuleManifest {
  /**
   * Unique module name (e.g., "garden", "finance")
   */
  name: string;

  /**
   * Semantic version
   */
  version: string;

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Module author
   */
  author: string;

  /**
   * Required permissions
   */
  permissions: Permission[];

  /**
   * Module dependencies (name -> version)
   */
  dependencies: Record<string, string>;

  /**
   * Events this module subscribes to
   */
  events?: {
    subscribes: string[];
    publishes: string[];
  };
}

/**
 * Permission types that modules can request
 */
export type Permission =
  | 'calendar.read'
  | 'calendar.write'
  | 'email.read'
  | 'notifications.send'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'network.access';

/**
 * Route definition for module API endpoints
 */
export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: unknown, res: unknown) => Promise<unknown>;
}

/**
 * UI Component registration
 */
export interface ComponentRegistry {
  /**
   * Dashboard widgets
   */
  widgets?: Array<{
    id: string;
    component: unknown; // React component
    defaultSize?: { width: number; height: number };
  }>;

  /**
   * Navigation items
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: string;
    path: string;
    order?: number;
  }>;

  /**
   * Settings panels
   */
  settingsPanels?: Array<{
    id: string;
    label: string;
    component: unknown;
  }>;
}

/**
 * Database migration definition
 */
export interface Migration {
  /**
   * Migration version (timestamp or sequential number)
   */
  version: string;

  /**
   * Migration name
   */
  name: string;

  /**
   * SQL to run when migrating up
   */
  up: string;

  /**
   * SQL to run when rolling back
   */
  down: string;

  /**
   * Dependencies on other migrations
   */
  dependencies?: string[];
}

/**
 * Module context provided during initialization.
 * Gives modules access to core services.
 */
export interface ModuleContext {
  /**
   * Event bus for pub/sub communication
   */
  eventBus: {
    publish: <T = unknown>(event: DomainEvent<T>) => Promise<void>;
    subscribe: (
      eventType: string,
      handler: EventHandler,
      priority?: number
    ) => string;
    unsubscribe: (subscriptionId: string) => boolean;
  };

  /**
   * Logger instance scoped to this module
   */
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    debug: (message: string, meta?: Record<string, unknown>) => void;
  };

  /**
   * Configuration for this module
   */
  config: Record<string, unknown>;

  /**
   * Database connection (if module has database access permission)
   */
  database?: unknown; // Will be typed properly when implementing database layer

  /**
   * Other core services can be added here
   * (cache, job queue, file storage, etc.)
   */
}

/**
 * Main module interface that all modules must implement.
 * Follows the Strategy pattern - each module implements this interface differently.
 */
export interface IModule {
  /**
   * Module metadata
   */
  readonly manifest: ModuleManifest;

  /**
   * Initialize the module.
   * Called when module is loaded.
   * Should set up event subscriptions, database connections, etc.
   *
   * @param context - Module context with access to core services
   */
  initialize(context: ModuleContext): Promise<void>;

  /**
   * Shutdown the module gracefully.
   * Called when application is shutting down.
   * Should clean up resources, close connections, etc.
   */
  shutdown(): Promise<void>;

  /**
   * Get API routes this module provides.
   * These will be registered with the API server.
   */
  getRoutes(): Route[];

  /**
   * Get GraphQL schema for this module.
   * Will be stitched into the main GraphQL schema.
   */
  getGraphQLSchema?(): string; // GraphQL SDL string

  /**
   * Get UI components this module provides.
   * These will be registered with the frontend.
   */
  getUIComponents(): ComponentRegistry;

  /**
   * Get event handlers for this module.
   * Alternative to subscribing in initialize().
   */
  getEventHandlers(): Record<string, EventHandler>;

  /**
   * Get database migrations for this module.
   * These will be run during database setup/updates.
   */
  getMigrations(): Migration[];

  /**
   * Health check for this module.
   * Used for monitoring and diagnostics.
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

/**
 * Module state tracking
 */
export enum ModuleState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN = 'shutdown',
}

/**
 * Module information tracked by the registry
 */
export interface ModuleInfo {
  module: IModule;
  state: ModuleState;
  error?: Error;
  loadedAt?: Date;
  initializedAt?: Date;
}
