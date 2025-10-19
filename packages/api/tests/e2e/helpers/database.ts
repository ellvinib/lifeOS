import { PrismaClient } from '@prisma/client';

/**
 * Test Database Helper
 *
 * Utilities for managing test database state.
 * Provides clean slate for each test.
 */

let prisma: PrismaClient;

/**
 * Initialize test database connection
 */
export async function initTestDatabase(): Promise<PrismaClient> {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://lifeos:lifeos_dev_password@localhost:5432/lifeos_test',
        },
      },
    });
    await prisma.$connect();
  }
  return prisma;
}

/**
 * Clean all test data
 *
 * Deletes all records from Finance module tables.
 * Call this before each test to ensure clean state.
 */
export async function cleanDatabase(): Promise<void> {
  const db = await initTestDatabase();

  // Delete in correct order (respect foreign keys)
  await db.financeInvoiceTransactionMatch.deleteMany();
  await db.financeInvoice.deleteMany();
  await db.financeVendor.deleteMany();
  await db.bankTransaction.deleteMany();
  await db.bankAccount.deleteMany();
  await db.user.deleteMany();
}

/**
 * Seed test user
 *
 * Creates a test user for authentication.
 */
export async function seedTestUser() {
  const db = await initTestDatabase();

  const user = await db.user.create({
    data: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'not-a-real-hash', // Tests don't use real auth
    },
  });

  return user;
}

/**
 * Seed test bank account
 *
 * Creates a bank account for transaction tests.
 */
export async function seedTestBankAccount(userId: string) {
  const db = await initTestDatabase();

  const bankAccount = await db.bankAccount.create({
    data: {
      id: 'test-bank-account-id',
      userId,
      accountNumber: 'BE68539007547034',
      bankName: 'Test Bank',
      accountType: 'CHECKING',
      balance: 10000,
      currency: 'EUR',
    },
  });

  return bankAccount;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

/**
 * Reset database to clean state
 *
 * Runs migrations and cleans data.
 */
export async function resetDatabase(): Promise<void> {
  const db = await initTestDatabase();

  // Run migrations (ensures schema is up to date)
  // This would normally use Prisma migrate
  // For tests, we assume migrations are already run

  // Clean all data
  await cleanDatabase();
}

/**
 * Get test database instance
 */
export function getTestDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error('Test database not initialized. Call initTestDatabase() first.');
  }
  return prisma;
}
