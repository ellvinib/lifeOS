import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { ModuleLoader, ModuleContext, ModuleRegistry } from '@lifeos/core/module-system';
import { EventBus } from '@lifeos/core/events';
import { BullMQAdapter } from './infrastructure/BullMQAdapter';
import * as path from 'path';

/**
 * LifeOS API Server
 *
 * Express server with module loading and lifecycle management.
 *
 * Architecture:
 * - Module-based: Each feature is a self-contained module
 * - Event-driven: Modules communicate via events
 * - Background jobs: BullMQ for async processing
 * - Clean shutdown: Graceful cleanup on SIGTERM/SIGINT
 */
export class LifeOSServer {
  private app: Express;
  private prisma: PrismaClient;
  private eventBus: EventBus;
  private jobQueue: BullMQAdapter;
  private moduleLoader: ModuleLoader;
  private server: any;

  constructor() {
    this.app = express();
    this.prisma = new PrismaClient();
    this.eventBus = new EventBus();
    this.jobQueue = new BullMQAdapter(process.env.REDIS_URL || 'redis://localhost:6379');
    this.moduleLoader = new ModuleLoader();
  }

  /**
   * Initialize and start server
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting LifeOS Server...');

      // Step 1: Setup middleware
      this.setupMiddleware();

      // Step 2: Connect to database
      await this.connectDatabase();

      // Step 3: Initialize job queue
      await this.jobQueue.initialize();

      // Step 4: Load modules
      await this.loadModules();

      // Step 5: Setup error handling
      this.setupErrorHandling();

      // Step 6: Start HTTP server
      await this.startHttpServer();

      // Step 7: Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ LifeOS Server started successfully!\n');
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    console.log('  ⚙️  Setting up middleware...');

    // Security
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('dev'));
    }

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    console.log('  ✅ Middleware configured');
  }

  /**
   * Connect to database
   */
  private async connectDatabase(): Promise<void> {
    console.log('  💾 Connecting to database...');
    try {
      await this.prisma.$connect();
      // Test connection
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('  ✅ Database connected');
    } catch (error) {
      console.error('  ❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Load all modules
   */
  private async loadModules(): Promise<void> {
    console.log('  📚 Loading modules...');

    const modulesPath = path.join(__dirname, '../../modules');
    console.log(`  📂 Modules directory: ${modulesPath}`);

    // Create module context
    const context: ModuleContext = {
      prisma: this.prisma,
      eventBus: this.eventBus,
      jobQueue: this.jobQueue,
      config: {},
    };

    try {
      // Load all modules (discovery happens internally)
      const result = await this.moduleLoader.loadAll(modulesPath, context);

      if (result.isFail()) {
        throw result.error;
      }

      // Get module registry to access loaded modules
      const registry = ModuleRegistry.getInstance();
      const loadedModules = registry.getAllModules();

      // Mount module routes
      for (const moduleInstance of loadedModules) {
        const routes = moduleInstance.getRoutes();
        if (routes) {
          this.app.use('/api', routes);
          console.log(`    ✓ Mounted routes for module: ${moduleInstance.name}`);
        }
      }

      console.log(`  ✅ Loaded ${loadedModules.length} module(s)`);
    } catch (error) {
      console.error('  ❌ Module loading failed:', error);
      throw error;
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: {
          message: 'Route not found',
          code: 'NOT_FOUND',
        },
      });
    });

    // Global error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ Unhandled error:', err);

      const statusCode = err.statusCode || 500;

      res.status(statusCode).json({
        error: {
          message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
          code: 'INTERNAL_SERVER_ERROR',
        },
      });
    });
  }

  /**
   * Start HTTP server
   */
  private async startHttpServer(): Promise<void> {
    const port = process.env.PORT || 3000;

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`🌐 Server listening on http://localhost:${port}`);
        console.log(`📖 API documentation: http://localhost:${port}/api`);
        console.log(`💚 Health check: http://localhost:${port}/health`);
        resolve();
      });
    });
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n📛 Received ${signal}, starting graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });
  }

  /**
   * Shutdown server gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down server...');

    try {
      // Step 1: Stop accepting new requests
      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        console.log('  ✅ HTTP server closed');
      }

      // Step 2: Shutdown modules
      console.log('  📚 Shutting down modules...');
      await this.moduleLoader.shutdownAll();
      console.log('  ✅ Modules shut down');

      // Step 3: Close job queue
      console.log('  💼 Closing job queue...');
      await this.jobQueue.close();
      console.log('  ✅ Job queue closed');

      // Step 4: Disconnect from database
      console.log('  📦 Disconnecting from database...');
      await this.prisma.$disconnect();
      console.log('  ✅ Database disconnected');

      console.log('✅ Server shut down gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get Express app (for testing)
   */
  getApp(): Express {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new LifeOSServer();
  server.start().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}
