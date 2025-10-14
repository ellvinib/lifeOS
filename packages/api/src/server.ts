import 'express-async-errors'; // Must be first! Handles async errors in routes
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { EventBus, EventStore } from '@lifeos/core';

import { DatabaseClient } from './infrastructure/database/DatabaseClient';
import { TaskRepository } from './infrastructure/repositories/TaskRepository';
import { createTaskRoutes } from './presentation/routes/taskRoutes';
import { errorHandler, notFoundHandler } from './presentation/middleware/errorHandler';

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

  // ========== Error Handling ==========
  // Must be LAST!
  app.use(notFoundHandler); // 404 handler
  app.use(errorHandler);    // Global error handler

  return app;
}

/**
 * Start the server.
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await DatabaseClient.connect();

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log('');
      console.log('✓ Server started successfully');
      console.log(`✓ Listening on port ${port}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log(`API: http://localhost:${port}/api`);
      console.log(`Health: http://localhost:${port}/health`);
      console.log('');
    });

    // ========== Graceful Shutdown ==========
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      // Close HTTP server (stop accepting new connections)
      server.close(async () => {
        console.log('✓ HTTP server closed');

        try {
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
