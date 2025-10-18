import { makeExecutableSchema } from '@graphql-tools/schema';
import { dashboardSchema } from './schema/dashboard.schema';
import { dashboardResolvers } from './resolvers/dashboard.resolvers';

/**
 * Combine all GraphQL schemas
 */
const typeDefs = [dashboardSchema];

/**
 * Combine all GraphQL resolvers
 */
const resolvers = [dashboardResolvers];

/**
 * Create executable GraphQL schema
 */
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export * from './resolvers/dashboard.resolvers';
