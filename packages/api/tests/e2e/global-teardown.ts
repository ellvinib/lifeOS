import { FullConfig } from '@playwright/test';
import { closeDatabase } from './helpers/database';

/**
 * Global Teardown
 *
 * Runs once after all tests.
 * Cleans up test environment and closes connections.
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');

  // Close database connection
  console.log('  📦 Closing database connection...');
  await closeDatabase();

  console.log('✅ Test environment cleaned up');
}

export default globalTeardown;
