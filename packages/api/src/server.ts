import 'express-async-errors'; // Must be first! Handles async errors in routes
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { EventBus, EventStore } from '@lifeos/core';

import { DatabaseClient } from './infrastructure/database/DatabaseClient';
import { TaskRepository } from './infrastructure/repositories/TaskRepository';
import { createTaskRoutes } from './presentation/routes/taskRoutes';
import { errorHandler, notFoundHandler } from './presentation/middleware/errorHandler';
import { JobQueueManager } from './infrastructure/jobs';
import { setupApolloServer } from './graphql/apollo';
import { createRedisConnection } from './infrastructure/jobs/redis';
import { RedisCacheService, DashboardCacheService } from './infrastructure/cache';

/**
 * Main server application.
 *
 * Design principles:
 * - Separation of concerns: App setup vs server start
 * - Dependency injection: Dependencies passed to routes
 * - Middleware chain: Security → Logging → Routes → Error handling
 * - Graceful shutdown: Clean up resources on exit
 */

/**
 * Create and configure Express application.
 */
function createApp(): express.Application {
  const app = express();

  // ========== Security Middleware ==========
  app.use(helmet()); // Security headers
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // ========== Body Parsing ==========
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ========== Compression ==========
  app.use(compression());

  // ========== Request Logging ==========
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // ========== Root Route ==========
  app.get('/', (req, res) => {
    const port = process.env.PORT || 3000;
    res.json({
      name: 'LifeOS API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        rest: `http://localhost:${port}/api`,
        graphql: `http://localhost:${port}/graphql`,
        health: `http://localhost:${port}/health`,
      },
      modules: {
        tasks: `http://localhost:${port}/api/tasks`,
        garden: `http://localhost:${port}/api/garden`,
        // finance: `http://localhost:${port}/api/finance`, // Temporarily disabled - missing dependencies
        calendar: `http://localhost:${port}/api/calendar/events`,
        auth: `http://localhost:${port}/api/auth`,
      },
      documentation: 'https://github.com/yourusername/lifeOS',
    });
  });

  // ========== Health Check ==========
  app.get('/health', async (req, res) => {
    const isDbHealthy = await DatabaseClient.healthCheck();
    res.status(isDbHealthy ? 200 : 503).json({
      status: isDbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? 'connected' : 'disconnected',
    });
  });

  // ========== API Routes ==========
  // Initialize dependencies (in production, use DI container)
  const eventStore = new EventStore();
  const eventBus = new EventBus(eventStore);

  // Task repository
  const taskRepository = new TaskRepository();

  // Garden repositories
  const { GardenTaskRepository } = require('./infrastructure/repositories/GardenTaskRepository');
  const { PlantRepository } = require('./infrastructure/repositories/PlantRepository');
  const { GardenAreaRepository } = require('./infrastructure/repositories/GardenAreaRepository');

  const gardenTaskRepository = new GardenTaskRepository();
  const plantRepository = new PlantRepository();
  const gardenAreaRepository = new GardenAreaRepository();

  // Register routes with dependencies
  app.use('/api/tasks', createTaskRoutes(taskRepository, eventBus));

  // Garden routes
  const { createGardenRoutes } = require('./presentation/routes/gardenRoutes');
  app.use('/api/garden', createGardenRoutes(
    gardenTaskRepository,
    plantRepository,
    gardenAreaRepository,
    eventBus
  ));

  // Finance module routes (full implementation)
  // TODO: Fix finance module dependencies (csv-parse, multer) before uncommenting
  // const { createFinanceRoutes } = require('../../modules/finance/src/presentation/routes');
  // app.use('/api/finance', createFinanceRoutes(prisma, eventBus));

  // Calendar module routes
  const prisma = DatabaseClient.getInstance();
  const { createCalendarEventRoutes } = require('../../modules/calendar/src/presentation/routes');
  app.use('/api/calendar/events', createCalendarEventRoutes(prisma, eventBus));

  // Authentication routes
  const { createAuthRoutes } = require('./presentation/routes/auth.routes');
  app.use('/api/auth', createAuthRoutes(prisma));

  // Note: Error handlers will be registered AFTER GraphQL middleware in startServer()
  // This allows GraphQL routes to be registered before the catch-all 404 handler

  return app;
}

/**
 * Start the server.
 */
async function startServer(): Promise<void> {
  let jobQueueManager: JobQueueManager | null = null;
  let redisCacheService: RedisCacheService | null = null;

  try {
    // Connect to database
    await DatabaseClient.connect();

    // Initialize shared dependencies
    const prisma = DatabaseClient.getInstance();
    const eventStore = new EventStore();
    const eventBus = new EventBus(eventStore);

    // Initialize Redis cache
    const redisClient = createRedisConnection();
    redisCacheService = new RedisCacheService(redisClient);
    const dashboardCache = new DashboardCacheService(redisCacheService);
    console.log('✓ Redis cache initialized');

    // Initialize job queue manager
    jobQueueManager = new JobQueueManager(prisma, eventBus);
    await jobQueueManager.initialize();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Setup Apollo GraphQL server with cache
    await setupApolloServer(app, httpServer, prisma, eventBus, dashboardCache);

    // ========== Error Handling ==========
    // Must be LAST! After all routes including GraphQL
    app.use(notFoundHandler); // 404 handler
    app.use(errorHandler);    // Global error handler

    // Start HTTP server
    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      console.log('');
      console.log('✓ Server started successfully');
      console.log(`✓ Listening on port ${port}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log(`REST API: http://localhost:${port}/api`);
      console.log(`GraphQL: http://localhost:${port}/graphql`);
      console.log(`Health: http://localhost:${port}/health`);
      console.log('');
    });

    // ========== Graceful Shutdown ==========
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      // Close HTTP server (stop accepting new connections)
      httpServer.close(async () => {
        console.log('✓ HTTP server closed');

        try {
          // Shutdown job queues
          if (jobQueueManager) {
            await jobQueueManager.shutdown();
          }

          // Disconnect Redis cache
          if (redisCacheService) {
            await redisCacheService.disconnect();
            console.log('✓ Redis cache disconnected');
          }

          // Disconnect from database
          await DatabaseClient.disconnect();

          console.log('✓ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('✗ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('UNCAUGHT EXCEPTION:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { createApp, startServer };
