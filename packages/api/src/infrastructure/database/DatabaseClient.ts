import { PrismaClient } from '@prisma/client';

/**
 * Database client singleton.
 * Manages Prisma client lifecycle following best practices.
 *
 * Design principles:
 * - Singleton pattern: Only one Prisma client instance
 * - Lazy initialization: Client created on first use
 * - Proper cleanup: Disconnect on shutdown
 * - Connection pooling: Reuse connections
 *
 * Usage:
 * ```typescript
 * const db = DatabaseClient.getInstance();
 * const tasks = await db.task.findMany();
 * ```
 */
export class DatabaseClient {
  private static instance: PrismaClient | null = null;
  private static isConnected = false;

  /**
   * Private constructor to prevent direct instantiation.
   * Use getInstance() instead.
   */
  private constructor() {}

  /**
   * Get the Prisma client instance.
   * Creates client on first call (lazy initialization).
   *
   * @returns PrismaClient instance
   */
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
      });

      // Log queries in development
      if (process.env.NODE_ENV === 'development') {
        this.instance.$on('query' as never, (e: unknown) => {
          const event = e as { query: string; duration: number };
          console.log(`Query: ${event.query}`);
          console.log(`Duration: ${event.duration}ms`);
        });
      }

      // Log errors
      this.instance.$on('error' as never, (e: unknown) => {
        const event = e as { message: string };
        console.error('Database error:', event.message);
      });

      // Log warnings
      this.instance.$on('warn' as never, (e: unknown) => {
        const event = e as { message: string };
        console.warn('Database warning:', event.message);
      });
    }

    return this.instance;
  }

  /**
   * Connect to the database.
   * Call this during application startup.
   *
   * @returns Promise that resolves when connected
   */
  static async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const client = this.getInstance();
      await client.$connect();
      this.isConnected = true;
      console.log('✓ Database connected');
    } catch (error) {
      console.error('✗ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database.
   * Call this during application shutdown.
   *
   * @returns Promise that resolves when disconnected
   */
  static async disconnect(): Promise<void> {
    if (!this.instance || !this.isConnected) {
      return;
    }

    try {
      await this.instance.$disconnect();
      this.isConnected = false;
      this.instance = null;
      console.log('✓ Database disconnected');
    } catch (error) {
      console.error('✗ Database disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected.
   *
   * @returns True if connected
   */
  static isDbConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Execute a function within a transaction.
   * Handles rollback automatically on error.
   *
   * @param fn - Function to execute in transaction
   * @returns Result of the function
   */
  static async transaction<T>(
    fn: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.getInstance();
    return client.$transaction(async (tx) => {
      return fn(tx as PrismaClient);
    });
  }

  /**
   * Health check for the database connection.
   *
   * @returns True if database is accessible
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = this.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
