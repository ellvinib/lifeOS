import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { ModuleLoader, ModuleContext } from '@lifeos/core/module-system';
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

      // Step 3: Load and initialize modules
      await this.loadModules();

      // Step 4: Setup error handlers
      this.setupErrorHandlers();

      // Step 5: Start HTTP server
      await this.startHttpServer();

      // Step 6: Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ LifeOS Server started successfully');
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
    // Security
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API info endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'LifeOS API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      });
    });
  }

  /**
   * Connect to database
   */
  private async connectDatabase(): Promise<void> {
    console.log('📦 Connecting to database...');
    await this.prisma.$connect();
    console.log('✅ Database connected');
  }

  /**
   * Load and initialize modules
   */
  private async loadModules(): Promise<void> {
    console.log('📚 Loading modules...');

    const modulesPath = path.join(__dirname, '../../modules');

    const context: ModuleContext = {
      prisma: this.prisma,
      eventBus: this.eventBus,
      jobQueue: this.jobQueue,
      config: {
        geminiApiKey: process.env.GEMINI_API_KEY,
        mailgunSigningKey: process.env.MAILGUN_SIGNING_KEY,
        mailgunApiKey: process.env.MAILGUN_API_KEY,
        fileStoragePath: process.env.FILE_STORAGE_PATH || './data',
      },
      storagePath: process.env.FILE_STORAGE_PATH || './data',
      env: (process.env.NODE_ENV as any) || 'development',
    };

    const result = await this.moduleLoader.loadAll(modulesPath, context);

    if (result.isFail()) {
      throw new Error(`Failed to load modules: ${result.error.message}`);
    }

    const loadedModules = result.value;
    console.log(`✅ Loaded ${loadedModules.length} modules:`, loadedModules.join(', '));

    // Mount module routes
    this.mountModuleRoutes();
  }

  /**
   * Mount routes from all loaded modules
   */
  private mountModuleRoutes(): void {
    const registry = this.moduleLoader['registry']; // Access private registry
    const modules = registry.getAllModules();

    for (const module of modules) {
      const router = module.getRoutes();
      if (router) {
        const basePath = `/api/${module.name}`;
        this.app.use(basePath, router);
        console.log(`  📍 Mounted routes: ${basePath}`);
      }
    }
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Route not found',
          code: 'ROUTE_NOT_FOUND',
          path: req.path,
        },
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', err);

      res.status(500).json({
        success: false,
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
