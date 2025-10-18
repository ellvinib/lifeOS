/**
 * Bank Integration Routes
 *
 * Consolidated routes for bank connections, accounts, and transactions.
 */

import { Router } from 'express';
import {
  BankConnectionController,
  BankAccountController,
  BankTransactionController,
} from '../controllers';

/**
 * Bank Routes
 *
 * /api/finance/bank/*
 */
export const createBankRoutes = (
  connectionController: BankConnectionController,
  accountController: BankAccountController,
  transactionController: BankTransactionController
): Router => {
  const router = Router();

  // ===== Connection Routes =====
  // POST /api/finance/bank/auth-url - Get authorization URL
  router.post('/auth-url', connectionController.getAuthorizationUrl.bind(connectionController));

  // POST /api/finance/bank/connect - Complete OAuth connection
  router.post('/connect', connectionController.completeConnection.bind(connectionController));

  // GET /api/finance/bank/connections - Get all connections
  router.get('/connections', connectionController.getConnections.bind(connectionController));

  // GET /api/finance/bank/connections/:id - Get connection by ID
  router.get('/connections/:id', connectionController.getConnectionById.bind(connectionController));

  // POST /api/finance/bank/connections/:id/sync - Sync bank data
  router.post('/connections/:id/sync', connectionController.syncBankData.bind(connectionController));

  // DELETE /api/finance/bank/connections/:id - Disconnect bank
  router.delete('/connections/:id', connectionController.disconnectBank.bind(connectionController));

  // ===== Account Routes =====
  // GET /api/finance/bank/accounts - Get all accounts
  router.get('/accounts', accountController.getAccounts.bind(accountController));

  // GET /api/finance/bank/accounts/:id - Get account by ID
  router.get('/accounts/:id', accountController.getAccountById.bind(accountController));

  // PATCH /api/finance/bank/accounts/:id/sync - Toggle sync for account
  router.patch('/accounts/:id/sync', accountController.toggleSync.bind(accountController));

  // ===== Transaction Routes =====
  // GET /api/finance/bank/transactions - Get all transactions
  router.get('/transactions', transactionController.getTransactions.bind(transactionController));

  // GET /api/finance/bank/transactions/unreconciled - Get unreconciled transactions
  router.get(
    '/transactions/unreconciled',
    transactionController.getUnreconciledTransactions.bind(transactionController)
  );

  // GET /api/finance/bank/transactions/matches - Get potential matches for expense
  router.get('/transactions/matches', transactionController.getPotentialMatches.bind(transactionController));

  // GET /api/finance/bank/transactions/statistics - Get transaction statistics
  router.get('/transactions/statistics', transactionController.getStatistics.bind(transactionController));

  // GET /api/finance/bank/transactions/:id - Get transaction by ID
  router.get('/transactions/:id', transactionController.getTransactionById.bind(transactionController));

  // POST /api/finance/bank/transactions/:id/reconcile - Reconcile transaction
  router.post(
    '/transactions/:id/reconcile',
    transactionController.reconcileTransaction.bind(transactionController)
  );

  // POST /api/finance/bank/transactions/:id/ignore - Ignore transaction
  router.post('/transactions/:id/ignore', transactionController.ignoreTransaction.bind(transactionController));

  // POST /api/finance/bank/transactions/:id/unreconcile - Unreconcile transaction
  router.post(
    '/transactions/:id/unreconcile',
    transactionController.unreconcileTransaction.bind(transactionController)
  );

  return router;
};
