import * as fs from 'fs/promises';
import * as path from 'path';
import { IModule, ModuleContext, ModuleMetadata } from './IModule';
import { ModuleRegistry } from './ModuleRegistry';
import { Result } from '../shared/result';
import { BaseError, ValidationError, ModuleError } from '../shared/errors';

/**
 * Module Loader
 *
 * Discovers, loads, and initializes modules from the filesystem.
 *
 * Process:
 * 1. Scan modules directory
 * 2. Read module.json for each module
 * 3. Validate metadata
 * 4. Import module class
 * 5. Register with ModuleRegistry
 * 6. Initialize module
 * 7. Subscribe to events
 *
 * Design Principles:
 * - Fail fast: Invalid modules prevent startup
 * - Dependency ordering: Load dependencies first
 * - Error isolation: One module error doesn't crash all
 */
export class ModuleLoader {
  private registry: ModuleRegistry;

  constructor() {
    this.registry = ModuleRegistry.getInstance();
  }

  /**
   * Load all modules from directory
   *
   * @param modulesPath Path to modules directory
   * @param context Module context for initialization
   * @returns Result with loaded module names or error
   */
  public async loadAll(
    modulesPath: string,
    context: ModuleContext
  ): Promise<Result<string[], BaseError>> {
    try {
      // Step 1: Discover modules
      const discoveryResult = await this.discoverModules(modulesPath);
      if (discoveryResult.isFail()) {
        return Result.fail(discoveryResult.error);
      }

      const moduleConfigs = discoveryResult.value;

      // Step 2: Sort by dependencies (topological sort)
      const sortedConfigs = this.sortByDependencies(moduleConfigs);

      // Step 3: Load and initialize each module
      const loadedModules: string[] = [];
      const errors: BaseError[] = [];

      for (const config of sortedConfigs) {
        const loadResult = await this.loadModule(config, context);

        if (loadResult.isOk()) {
          loadedModules.push(config.metadata.name);
        } else {
          errors.push(loadResult.error);
          // Continue loading other modules (fail gracefully)
        }
      }

      if (errors.length > 0) {
        return Result.fail(
          new ValidationError(
            `Failed to load ${errors.length} module(s): ${errors.map((e) => e.message).join(', ')}`,
            errors.map((e, i) => ({
              field: `module_${i}`,
              message: e.message,
            }))
          )
        );
      }

      return Result.ok(loadedModules);
    } catch (error) {
      return Result.fail(
        new ModuleError(
          'Failed to load modules',
          'MODULE_LOAD_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Load single module
   *
   * @param modulePath Path to module directory
   * @param context Module context for initialization
   * @returns Result with module name or error
   */
  public async loadModule(
    config: ModuleConfig,
    context: ModuleContext
  ): Promise<Result<string, BaseError>> {
    try {
      const { modulePath, metadata } = config;

      // Import module class
      const moduleMain = path.join(modulePath, metadata.main);
      const moduleExports = await import(moduleMain);

      // Find module class (should export default or named export)
      const ModuleClass =
        moduleExports.default || moduleExports[`${capitalize(metadata.name)}Module`];

      if (!ModuleClass) {
        return Result.fail(
          new ValidationError(
            `Module "${metadata.name}" does not export a module class`,
            [{ field: 'main', message: 'No default export found' }]
          )
        );
      }

      // Instantiate module
      const moduleInstance: IModule = new ModuleClass();

      // Register module
      const registerResult = this.registry.register(moduleInstance, metadata);
      if (registerResult.isFail()) {
        return Result.fail(registerResult.error);
      }

      // Update state to initializing
      this.registry.updateState(metadata.name, 'initializing');

      // Initialize module
      await moduleInstance.initialize(context);

      // Subscribe to events
      const eventHandlers = moduleInstance.getEventHandlers();
      if (eventHandlers && context.eventBus) {
        for (const [eventType, handler] of Object.entries(eventHandlers)) {
          await context.eventBus.subscribe(eventType, handler);
        }
      }

      // Update state to initialized
      this.registry.updateState(metadata.name, 'initialized');

      return Result.ok(metadata.name);
    } catch (error) {
      // Update state to error
      if (config.metadata) {
        this.registry.updateState(config.metadata.name, 'error');
      }

      return Result.fail(
        new ModuleError(
          `Failed to load module: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MODULE_LOAD_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Shutdown all modules
   *
   * @returns Result with shutdown module names or error
   */
  public async shutdownAll(): Promise<Result<string[], BaseError>> {
    const modules = this.registry.getAllModules();
    const shutdownModules: string[] = [];
    const errors: BaseError[] = [];

    // Shutdown in reverse order (dependencies last)
    for (const module of modules.reverse()) {
      try {
        this.registry.updateState(module.name, 'shutting-down');
        await module.shutdown();
        this.registry.updateState(module.name, 'shutdown');
        shutdownModules.push(module.name);
      } catch (error) {
        errors.push(
          new ModuleError(
            `Failed to shutdown module "${module.name}"`,
            'MODULE_SHUTDOWN_ERROR',
            500,
            {},
            error instanceof Error ? error : undefined
          )
        );
      }
    }

    if (errors.length > 0) {
      return Result.fail(
        new ValidationError(
          `Failed to shutdown ${errors.length} module(s)`,
          errors.map((e, i) => ({
            field: `module_${i}`,
            message: e.message,
          }))
        )
      );
    }

    return Result.ok(shutdownModules);
  }

  /**
   * Discover modules in directory
   *
   * @param modulesPath Path to modules directory
   * @returns Array of module configurations
   */
  private async discoverModules(
    modulesPath: string
  ): Promise<Result<ModuleConfig[], BaseError>> {
    try {
      const entries = await fs.readdir(modulesPath, { withFileTypes: true });
      const modules: ModuleConfig[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const modulePath = path.join(modulesPath, entry.name);
        const metadataPath = path.join(modulePath, 'module.json');

        // Check if module.json exists
        try {
          await fs.access(metadataPath);
        } catch {
          // Skip directories without module.json
          continue;
        }

        // Read and parse module.json
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata: ModuleMetadata = JSON.parse(metadataContent);

        // Validate metadata
        const validationResult = this.validateMetadata(metadata);
        if (validationResult.isFail()) {
          return Result.fail(validationResult.error);
        }

        modules.push({ modulePath, metadata });
      }

      return Result.ok(modules);
    } catch (error) {
      return Result.fail(
        new ModuleError(
          'Failed to discover modules',
          'MODULE_DISCOVERY_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Validate module metadata
   *
   * @param metadata Module metadata
   * @returns Result with success or validation error
   */
  private validateMetadata(metadata: ModuleMetadata): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Module name is required' });
    }

    if (!metadata.version || !/^\d+\.\d+\.\d+/.test(metadata.version)) {
      errors.push({ field: 'version', message: 'Valid semantic version is required' });
    }

    if (!metadata.main || metadata.main.trim().length === 0) {
      errors.push({ field: 'main', message: 'Main entry point is required' });
    }

    if (errors.length > 0) {
      return Result.fail(
        new ValidationError(
          `Invalid module metadata for "${metadata.name || 'unknown'}"`,
          errors
        )
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Sort modules by dependencies (topological sort)
   *
   * @param modules Module configurations
   * @returns Sorted array (dependencies first)
   */
  private sortByDependencies(modules: ModuleConfig[]): ModuleConfig[] {
    // Simple implementation: core modules first, then others
    // TODO: Implement full topological sort based on dependencies
    return modules.sort((a, b) => {
      const aIsCore = a.metadata.name === 'core';
      const bIsCore = b.metadata.name === 'core';

      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      return 0;
    });
  }
}

/**
 * Module Configuration
 *
 * Internal representation of discovered module
 */
interface ModuleConfig {
  modulePath: string;
  metadata: ModuleMetadata;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
