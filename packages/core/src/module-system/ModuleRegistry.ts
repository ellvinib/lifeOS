import { IModule, ModuleMetadata } from './IModule';
import { Result } from '../shared/result';
import { BaseError, NotFoundError, ModuleError } from '../shared/errors';

/**
 * Module Registry
 *
 * Central registry for all loaded modules.
 * Provides module discovery and lifecycle management.
 *
 * Design Principles:
 * - Singleton pattern: One registry per application
 * - Type-safe module registration
 * - Supports module dependencies
 * - Validates module metadata
 */
export class ModuleRegistry {
  private static instance: ModuleRegistry | null = null;
  private modules: Map<string, RegisteredModule> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  /**
   * Register a module
   *
   * @param module Module instance
   * @param metadata Module metadata from module.json
   * @returns Result with success/error
   */
  public register(
    module: IModule,
    metadata: ModuleMetadata
  ): Result<void, BaseError> {
    // Validate module name matches metadata
    if (module.name !== metadata.name) {
      return Result.fail(
        new ModuleError(
          `Module name mismatch: instance="${module.name}", metadata="${metadata.name}"`,
          'MODULE_NAME_MISMATCH',
          400
        )
      );
    }

    // Check if module already registered
    if (this.modules.has(module.name)) {
      return Result.fail(
        new ModuleError(
          `Module "${module.name}" is already registered`,
          'MODULE_ALREADY_REGISTERED',
          409
        )
      );
    }

    // Register module
    this.modules.set(module.name, {
      module,
      metadata,
      state: 'registered',
      registeredAt: new Date(),
    });

    return Result.ok(undefined);
  }

  /**
   * Get module by name
   *
   * @param name Module name
   * @returns Module instance or error
   */
  public getModule(name: string): Result<IModule, BaseError> {
    const registered = this.modules.get(name);
    if (!registered) {
      return Result.fail(
        new NotFoundError('Module', name)
      );
    }

    return Result.ok(registered.module);
  }

  /**
   * Get module metadata
   *
   * @param name Module name
   * @returns Module metadata or error
   */
  public getMetadata(name: string): Result<ModuleMetadata, BaseError> {
    const registered = this.modules.get(name);
    if (!registered) {
      return Result.fail(
        new NotFoundError('Module', name)
      );
    }

    return Result.ok(registered.metadata);
  }

  /**
   * Get all registered modules
   *
   * @returns Array of all modules
   */
  public getAllModules(): IModule[] {
    return Array.from(this.modules.values()).map((r) => r.module);
  }

  /**
   * Get all module metadata
   *
   * @returns Array of all module metadata
   */
  public getAllMetadata(): ModuleMetadata[] {
    return Array.from(this.modules.values()).map((r) => r.metadata);
  }

  /**
   * Check if module is registered
   *
   * @param name Module name
   * @returns True if registered
   */
  public hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Update module state
   *
   * @param name Module name
   * @param state New state
   * @returns Result with success/error
   */
  public updateState(
    name: string,
    state: ModuleState
  ): Result<void, BaseError> {
    const registered = this.modules.get(name);
    if (!registered) {
      return Result.fail(
        new NotFoundError('Module', name)
      );
    }

    registered.state = state;
    registered.updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Get module state
   *
   * @param name Module name
   * @returns Module state or error
   */
  public getState(name: string): Result<ModuleState, BaseError> {
    const registered = this.modules.get(name);
    if (!registered) {
      return Result.fail(
        new NotFoundError('Module', name)
      );
    }

    return Result.ok(registered.state);
  }

  /**
   * Get modules by state
   *
   * @param state Module state to filter by
   * @returns Array of modules in that state
   */
  public getModulesByState(state: ModuleState): IModule[] {
    return Array.from(this.modules.values())
      .filter((r) => r.state === state)
      .map((r) => r.module);
  }

  /**
   * Clear all modules (for testing)
   */
  public clear(): void {
    this.modules.clear();
  }

  /**
   * Get registry statistics
   */
  public getStats(): RegistryStats {
    const states = Array.from(this.modules.values()).reduce(
      (acc, r) => {
        acc[r.state] = (acc[r.state] || 0) + 1;
        return acc;
      },
      {} as Record<ModuleState, number>
    );

    return {
      total: this.modules.size,
      byState: states,
    };
  }
}

/**
 * Registered Module
 *
 * Internal representation of a registered module
 */
interface RegisteredModule {
  module: IModule;
  metadata: ModuleMetadata;
  state: ModuleState;
  registeredAt: Date;
  updatedAt?: Date;
}

/**
 * Module State
 *
 * Tracks module lifecycle
 */
export type ModuleState =
  | 'registered' // Module registered but not initialized
  | 'initializing' // Module initialization in progress
  | 'initialized' // Module initialized and ready
  | 'error' // Module initialization failed
  | 'shutting-down' // Module shutdown in progress
  | 'shutdown'; // Module shut down

/**
 * Registry Statistics
 */
interface RegistryStats {
  total: number;
  byState: Record<ModuleState, number>;
}
