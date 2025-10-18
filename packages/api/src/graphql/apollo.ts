import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express, { Express } from 'express';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import { schema } from './index';
import { DashboardResolverContext } from './resolvers/dashboard.resolvers';
import { DashboardCacheService } from '../infrastructure/cache';

/**
 * Create and configure Apollo Server
 */
export async function setupApolloServer(
  app: Express,
  httpServer: http.Server,
  prisma: PrismaClient,
  eventBus: EventBus,
  dashboardCache?: DashboardCacheService
): Promise<ApolloServer<DashboardResolverContext>> {
  const server = new ApolloServer<DashboardResolverContext>({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Local development landing page
      process.env.NODE_ENV === 'production'
        ? {
            async serverWillStart() {
              return {
                async drainServer() {},
              };
            },
          }
        : ApolloServerPluginLandingPageLocalDefault({
            embed: true,
            includeCookies: true,
          }),
    ],
    formatError: (formattedError, error) => {
      // Log errors for debugging
      console.error('GraphQL Error:', {
        message: formattedError.message,
        path: formattedError.path,
        extensions: formattedError.extensions,
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (formattedError.message.startsWith('Internal')) {
          return {
            ...formattedError,
            message: 'An internal error occurred',
          };
        }
      }

      return formattedError;
    },
  });

  // Start Apollo Server
  await server.start();

  // Apply Apollo middleware to Express
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // In production, extract userId from JWT token
        // For now, using a placeholder
        const userId = req.headers['x-user-id'] as string | undefined;

        return {
          prisma,
          eventBus,
          userId,
          dashboardCache,
        };
      },
    })
  );

  console.log('✓ GraphQL server ready at /graphql');

  return server;
}
