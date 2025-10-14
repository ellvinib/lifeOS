import type { EventBus } from '../events';

import type { IModule, ModuleContext } from './IModule';
import { ModuleState } from './IModule';
import type { ModuleRegistry } from './ModuleRegistry';

/**
 * Logger interface for module loader
 */
interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Module loader configuration
 */
export interface ModuleLoaderConfig {
  /**
   * Event bus instance
   */
  eventBus: EventBus;

  /**
   * Logger instance
   */
  logger: Logger;

  /**
   * Module configurations
   */
  moduleConfigs?: Record<string, Record<string, unknown>>;

  /**
   * Database connection (optional)
   */
  database?: unknown;
}

/**
 * Module loader handles loading and initializing modules.
 * Implements the Factory pattern for creating module instances.
 *
 * Features:
 * - Load modules in dependency order
 * - Initialize modules with context
 * - Handle initialization errors
 * - Graceful shutdown
 */
export class ModuleLoader {
  constructor(
    private registry: ModuleRegistry,
    private config: ModuleLoaderConfig
  ) {}

  /**
   * Load and register a module.
   *
   * @param module - Module to load
   * @throws Error if module dependencies not met
   */
  async load(module: IModule): Promise<void> {
    const name = module.manifest.name;

    this.config.logger.info(`Loading module: ${name}`);

    // Register module
    this.registry.register(module);

    // Validate dependencies
    const missingDeps = this.registry.validateDependencies(name);
    if (missingDeps.length > 0) {
      const error = new Error(
        `Module ${name} has missing dependencies: ${missingDeps.join(', ')}`
      );
      this.registry.updateState(name, ModuleState.ERROR, error);
      throw error;
    }

    this.config.logger.info(`Module loaded: ${name}`);
  }

  /**
   * Load multiple modules.
   *
   * @param modules - Array of modules to load
   */
  async loadAll(modules: IModule[]): Promise<void> {
    for (const module of modules) {
      await this.load(module);
    }
  }

  /**
   * Initialize a single module.
   *
   * @param name - Module name
   */
  async initialize(name: string): Promise<void> {
    const module = this.registry.get(name);
    if (!module) {
      throw new Error(`Module ${name} not found in registry`);
    }

    this.config.logger.info(`Initializing module: ${name}`);
    this.registry.updateState(name, ModuleState.INITIALIZING);

    try {
      // Create module context
      const context = this.createModuleContext(module);

      // Initialize module
      await module.initialize(context);

      // Register event handlers
      this.registerEventHandlers(module);

      // Mark as ready
      this.registry.updateState(name, ModuleState.READY);
      this.config.logger.info(`Module initialized: ${name}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.logger.error(`Failed to initialize module ${name}:`, {
        error: err.message,
      });
      this.registry.updateState(name, ModuleState.ERROR, err);
      throw err;
    }
  }

  /**
   * Initialize all loaded modules in dependency order.
   */
  async initializeAll(): Promise<void> {
    this.config.logger.info('Initializing all modules...');

    // Get initialization order (respects dependencies)
    const order = this.registry.getInitializationOrder();

    this.config.logger.info(`Initialization order: ${order.join(' -> ')}`);

    // Initialize modules in order
    for (const name of order) {
      await this.initialize(name);
    }

    this.config.logger.info('All modules initialized');
  }

  /**
   * Shutdown a single module.
   *
   * @param name - Module name
   */
  async shutdown(name: string): Promise<void> {
    const module = this.registry.get(name);
    if (!module) {
      throw new Error(`Module ${name} not found`);
    }

    this.config.logger.info(`Shutting down module: ${name}`);
    this.registry.updateState(name, ModuleState.SHUTTING_DOWN);

    try {
      await module.shutdown();
      this.registry.updateState(name, ModuleState.SHUTDOWN);
      this.config.logger.info(`Module shut down: ${name}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.logger.error(`Error shutting down module ${name}:`, {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Shutdown all modules in reverse initialization order.
   */
  async shutdownAll(): Promise<void> {
    this.config.logger.info('Shutting down all modules...');

    // Shutdown in reverse order
    const order = this.registry.getInitializationOrder().reverse();

    for (const name of order) {
      try {
        await this.shutdown(name);
      } catch (error) {
        // Log error but continue shutting down other modules
        this.config.logger.error(`Error during shutdown of ${name}, continuing...`);
      }
    }

    this.config.logger.info('All modules shut down');
  }

  /**
   * Create module context with access to core services.
   */
  private createModuleContext(module: IModule): ModuleContext {
    const moduleName = module.manifest.name;

    // Create scoped logger for this module
    const logger: Logger = {
      info: (msg, meta) =>
        this.config.logger.info(`[${moduleName}] ${msg}`, meta),
      warn: (msg, meta) =>
        this.config.logger.warn(`[${moduleName}] ${msg}`, meta),
      error: (msg, meta) =>
        this.config.logger.error(`[${moduleName}] ${msg}`, meta),
      debug: (msg, meta) =>
        this.config.logger.debug(`[${moduleName}] ${msg}`, meta),
    };

    // Create context
    const context: ModuleContext = {
      eventBus: {
        publish: (event) => this.config.eventBus.publish(event),
        subscribe: (eventType, handler, priority) =>
          this.config.eventBus.subscribe(eventType, handler, moduleName, priority),
        unsubscribe: (id) => this.config.eventBus.unsubscribe(id),
      },
      logger,
      config: this.config.moduleConfigs?.[moduleName] ?? {},
      database: this.config.database,
    };

    return context;
  }

  /**
   * Register event handlers from module.
   */
  private registerEventHandlers(module: IModule): void {
    const handlers = module.getEventHandlers();
    const moduleName = module.manifest.name;

    for (const [eventType, handler] of Object.entries(handlers)) {
      this.config.eventBus.subscribe(eventType, handler, moduleName);
      this.config.logger.debug(
        `Registered event handler for ${eventType} in module ${moduleName}`
      );
    }
  }

  /**
   * Health check all modules.
   */
  async healthCheck(): Promise<Record<string, { healthy: boolean; message?: string }>> {
    const results: Record<string, { healthy: boolean; message?: string }> = {};

    for (const module of this.registry.getAll()) {
      const name = module.manifest.name;
      try {
        if (module.healthCheck) {
          results[name] = await module.healthCheck();
        } else {
          // Default: healthy if module is in READY state
          const info = this.registry.getInfo(name);
          results[name] = {
            healthy: info?.state === ModuleState.READY,
            message: info?.state === ModuleState.READY ? 'OK' : `State: ${info?.state}`,
          };
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }
}
