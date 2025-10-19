import { chromium, FullConfig } from '@playwright/test';
import { initTestDatabase, resetDatabase, seedTestUser, seedTestBankAccount } from './helpers/database';

/**
 * Global Setup
 *
 * Runs once before all tests.
 * Sets up test database and seeds initial data.
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up test environment...');

  // Initialize database connection
  await initTestDatabase();

  // Reset database to clean state
  console.log('  📦 Resetting database...');
  await resetDatabase();

  // Seed test user
  console.log('  👤 Seeding test user...');
  const user = await seedTestUser();

  // Seed test bank account
  console.log('  🏦 Seeding test bank account...');
  await seedTestBankAccount(user.id);

  // Wait for API server to be ready
  console.log('  🌐 Waiting for API server...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  let retries = 30;
  let ready = false;

  while (retries > 0 && !ready) {
    try {
      const response = await page.goto(`${baseURL}/health`, { timeout: 2000 });
      if (response?.status() === 200) {
        ready = true;
        console.log('  ✅ API server is ready');
      }
    } catch (error) {
      retries--;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  await browser.close();

  if (!ready) {
    throw new Error('API server did not start in time');
  }

  console.log('✅ Test environment ready');
}

export default globalSetup;
