import dotenv from 'dotenv';
import { LifeOSServer } from './server';

// Load environment variables
dotenv.config();

/**
 * Start LifeOS API Server
 */
async function main() {
  const server = new LifeOSServer();
  await server.start();
}

// Start server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
