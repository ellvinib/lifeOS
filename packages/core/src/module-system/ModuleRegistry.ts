import type { IModule, ModuleInfo, ModuleState } from './IModule';
import { ModuleState as State } from './IModule';

/**
 * Central registry for all loaded modules.
 * Implements the Registry pattern for managing module lifecycle.
 *
 * Features:
 * - Module registration and discovery
 * - Dependency resolution
 * - State tracking
 * - Query capabilities
 */
export class ModuleRegistry {
  private modules: Map<string, ModuleInfo> = new Map();

  /**
   * Register a module in the registry.
   *
   * @param module - Module to register
   * @throws Error if module with same name already registered
   */
  register(module: IModule): void {
    const name = module.manifest.name;

    if (this.modules.has(name)) {
      throw new Error(`Module ${name} is already registered`);
    }

    this.modules.set(name, {
      module,
      state: State.LOADED,
      loadedAt: new Date(),
    });
  }

  /**
   * Unregister a module from the registry.
   *
   * @param name - Module name
   * @returns True if module was unregistered
   */
  unregister(name: string): boolean {
    return this.modules.delete(name);
  }

  /**
   * Get a module by name.
   *
   * @param name - Module name
   * @returns Module or undefined
   */
  get(name: string): IModule | undefined {
    return this.modules.get(name)?.module;
  }

  /**
   * Get module info (including state).
   *
   * @param name - Module name
   * @returns Module info or undefined
   */
  getInfo(name: string): ModuleInfo | undefined {
    return this.modules.get(name);
  }

  /**
   * Check if a module is registered.
   *
   * @param name - Module name
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get all registered modules.
   */
  getAll(): IModule[] {
    return Array.from(this.modules.values()).map((info) => info.module);
  }

  /**
   * Get all module names.
   */
  getAllNames(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Get modules by state.
   *
   * @param state - Module state to filter by
   */
  getByState(state: ModuleState): IModule[] {
    return Array.from(this.modules.values())
      .filter((info) => info.state === state)
      .map((info) => info.module);
  }

  /**
   * Update module state.
   *
   * @param name - Module name
   * @param state - New state
   * @param error - Optional error if state is ERROR
   */
  updateState(name: string, state: ModuleState, error?: Error): void {
    const info = this.modules.get(name);
    if (!info) {
      throw new Error(`Module ${name} not found in registry`);
    }

    info.state = state;
    if (error) {
      info.error = error;
    }
    if (state === State.READY) {
      info.initializedAt = new Date();
    }

    this.modules.set(name, info);
  }

  /**
   * Get module count.
   */
  count(): number {
    return this.modules.size;
  }

  /**
   * Check if all modules are in a given state.
   *
   * @param state - State to check
   */
  allInState(state: ModuleState): boolean {
    return Array.from(this.modules.values()).every((info) => info.state === state);
  }

  /**
   * Validate module dependencies are met.
   *
   * @param moduleName - Module to validate
   * @returns Array of missing dependencies
   */
  validateDependencies(moduleName: string): string[] {
    const module = this.get(moduleName);
    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    const missing: string[] = [];
    const deps = module.manifest.dependencies;

    for (const [depName, depVersion] of Object.entries(deps)) {
      const depModule = this.get(depName);
      if (!depModule) {
        missing.push(`${depName}@${depVersion}`);
        continue;
      }

      // Simple version check (in production, use semver)
      if (depModule.manifest.version !== depVersion) {
        missing.push(`${depName}@${depVersion} (found ${depModule.manifest.version})`);
      }
    }

    return missing;
  }

  /**
   * Get initialization order based on dependencies.
   * Uses topological sort to ensure dependencies are initialized first.
   *
   * @returns Array of module names in initialization order
   * @throws Error if circular dependency detected
   */
  getInitializationOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving module: ${name}`);
      }

      visiting.add(name);

      const module = this.get(name);
      if (module) {
        // Visit dependencies first
        for (const depName of Object.keys(module.manifest.dependencies)) {
          if (this.has(depName)) {
            visit(depName);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    // Visit all modules
    for (const name of this.modules.keys()) {
      visit(name);
    }

    return order;
  }

  /**
   * Get module statistics.
   */
  getStats(): {
    total: number;
    byState: Record<ModuleState, number>;
    withErrors: number;
  } {
    const byState: Record<string, number> = {};
    let withErrors = 0;

    for (const info of this.modules.values()) {
      byState[info.state] = (byState[info.state] ?? 0) + 1;
      if (info.error) {
        withErrors++;
      }
    }

    return {
      total: this.modules.size,
      byState: byState as Record<ModuleState, number>,
      withErrors,
    };
  }

  /**
   * Clear all modules from registry.
   * WARNING: This is destructive and should only be used in tests!
   */
  clear(): void {
    this.modules.clear();
  }
}
