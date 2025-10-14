/**
 * Garden Module
 *
 * Implements IModule interface for the Garden module.
 *
 * Design principles:
 * - Implements IModule: Follows module system contract
 * - Self-contained: Can be loaded/unloaded independently
 * - Event-driven: Communicates via events
 * - Declarative: Manifest describes capabilities
 */

import type {
  IModule,
  ModuleManifest,
  ModuleContext,
  Route,
  ComponentRegistry,
  EventHandler,
  Migration,
} from '@lifeos/core';

/**
 * Garden Module implementation.
 *
 * Manages garden-related functionality including:
 * - Plants and their care
 * - Garden areas and maintenance
 * - Garden tasks and scheduling
 */
export class GardenModule implements IModule {
  private context?: ModuleContext;
  private subscriptionIds: string[] = [];

  /**
   * Module manifest.
   */
  readonly manifest: ModuleManifest = {
    name: 'garden',
    version: '1.0.0',
    description: 'Garden management module for tracking plants, areas, and maintenance tasks',
    author: 'LifeOS Team',
    permissions: [],
    dependencies: {},
    events: {
      subscribes: [
        // Subscribe to core events
        'TaskCompleted',
        'UserPreferencesChanged',
      ],
      publishes: [
        // Garden module publishes these events
        'PlantCreated',
        'PlantWatered',
        'PlantFertilized',
        'PlantPruned',
        'PlantHarvested',
        'GardenAreaCreated',
        'GardenAreaMaintained',
        'GardenTaskCreated',
        'GardenTaskCompleted',
      ],
    },
  };

  /**
   * Initialize the module.
   */
  async initialize(context: ModuleContext): Promise<void> {
    this.context = context;

    // Log initialization
    context.logger.info('Initializing Garden module', {
      version: this.manifest.version,
    });

    // Subscribe to events
    this.subscribeToEvents();

    context.logger.info('Garden module initialized successfully');
  }

  /**
   * Shutdown the module gracefully.
   */
  async shutdown(): Promise<void> {
    if (!this.context) return;

    this.context.logger.info('Shutting down Garden module');

    // Unsubscribe from all events
    this.subscriptionIds.forEach((id) => {
      this.context!.eventBus.unsubscribe(id);
    });
    this.subscriptionIds = [];

    // Clean up any resources
    // (repositories, database connections, etc.)

    this.context.logger.info('Garden module shutdown complete');
  }

  /**
   * Get API routes this module provides.
   * Note: In our implementation, routes are registered separately.
   * This method returns empty array as routes are handled by Express.
   */
  getRoutes(): Route[] {
    return [];
  }

  /**
   * Get UI components this module provides.
   */
  getUIComponents(): ComponentRegistry {
    return {
      widgets: [
        {
          id: 'garden-summary',
          component: null, // Would be React component in production
          defaultSize: { width: 400, height: 300 },
        },
        {
          id: 'plants-needing-water',
          component: null,
          defaultSize: { width: 300, height: 400 },
        },
        {
          id: 'upcoming-tasks',
          component: null,
          defaultSize: { width: 400, height: 350 },
        },
      ],
      navigationItems: [
        {
          id: 'garden',
          label: 'Garden',
          icon: 'plant',
          path: '/garden',
          order: 2,
        },
        {
          id: 'garden-plants',
          label: 'Plants',
          icon: 'leaf',
          path: '/garden/plants',
          order: 3,
        },
        {
          id: 'garden-areas',
          label: 'Garden Areas',
          icon: 'map',
          path: '/garden/areas',
          order: 4,
        },
      ],
      settingsPanels: [
        {
          id: 'garden-settings',
          label: 'Garden Settings',
          component: null,
        },
      ],
    };
  }

  /**
   * Get event handlers for this module.
   */
  getEventHandlers(): Record<string, EventHandler> {
    return {
      TaskCompleted: this.handleTaskCompleted.bind(this),
      UserPreferencesChanged: this.handleUserPreferencesChanged.bind(this),
    };
  }

  /**
   * Get database migrations for this module.
   */
  getMigrations(): Migration[] {
    return [
      {
        version: '001',
        name: 'create_garden_tables',
        up: `
          -- Note: Actual migrations are handled by Prisma
          -- This is for documentation/reference
          CREATE TABLE IF NOT EXISTS garden_plants (
            id UUID PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            type VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `,
        down: `
          DROP TABLE IF EXISTS garden_plants;
        `,
      },
    ];
  }

  /**
   * Health check for this module.
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Check if module is initialized
      if (!this.context) {
        return {
          healthy: false,
          message: 'Module not initialized',
        };
      }

      // In production, check database connectivity, etc.
      // For now, return healthy if initialized
      return {
        healthy: true,
        message: 'Garden module is healthy',
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error}`,
      };
    }
  }

  /**
   * Subscribe to events from other modules.
   */
  private subscribeToEvents(): void {
    if (!this.context) return;

    // Subscribe to TaskCompleted events
    const taskCompletedId = this.context.eventBus.subscribe(
      'TaskCompleted',
      this.handleTaskCompleted.bind(this),
      0
    );
    this.subscriptionIds.push(taskCompletedId);

    // Subscribe to UserPreferencesChanged events
    const prefsChangedId = this.context.eventBus.subscribe(
      'UserPreferencesChanged',
      this.handleUserPreferencesChanged.bind(this),
      0
    );
    this.subscriptionIds.push(prefsChangedId);
  }

  /**
   * Handle TaskCompleted event.
   * Example cross-module communication.
   */
  private async handleTaskCompleted(event: any): Promise<void> {
    if (!this.context) return;

    this.context.logger.info('Garden module received TaskCompleted event', {
      taskId: event.payload.taskId,
    });

    // Business logic: If a garden task was completed, could:
    // - Update statistics
    // - Schedule next recurrence
    // - Send notifications
    // - Update plant care records
  }

  /**
   * Handle UserPreferencesChanged event.
   * Example of reacting to system events.
   */
  private async handleUserPreferencesChanged(event: any): Promise<void> {
    if (!this.context) return;

    this.context.logger.info('Garden module received UserPreferencesChanged event');

    // Business logic: Update module behavior based on preferences
    // - Notification preferences
    // - Language preferences
    // - Theme preferences
  }
}
