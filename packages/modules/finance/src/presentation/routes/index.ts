import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import { authenticate } from '../../../../../api/src/presentation/middleware/authenticate';
import {
  ExpenseController,
  BudgetController,
  BankConnectionController,
  BankAccountController,
  BankTransactionController,
  CategorizationController,
} from '../controllers';
import {
  ExpenseRepository,
  BudgetRepository,
  BankConnectionRepository,
  BankAccountRepository,
  BankTransactionRepository,
  CategorizationRuleRepository,
  TransactionClassificationRepository,
} from '../../infrastructure/repositories';
import { EncryptionService, IbanityApiService, createIbanityApiService } from '../../infrastructure/services';
import {
  CreateExpenseUseCase,
  GetTodayBudgetUseCase,
  CheckAffordabilityUseCase,
  GetEnvelopesUseCase,
  ConnectBankUseCase,
  SyncBankDataUseCase,
  DisconnectBankUseCase,
  ReconcileTransactionUseCase,
  SuggestCategoryUseCase,
  ProvideFeedbackUseCase,
  CreateCategorizationRuleUseCase,
} from '../../application/use-cases';
import { CategorizationService } from '../../application/services/CategorizationService';
import { createExpenseRoutes } from './expense.routes';
import { createBudgetRoutes } from './budget.routes';
import { createBankRoutes } from './bank.routes';
import { createCategorizationRoutes } from './categorization.routes';

/**
 * Create Finance Module Routes
 *
 * This factory function creates all routes for the Finance module
 * with proper dependency injection.
 */
export const createFinanceRoutes = (
  prisma: PrismaClient,
  eventBus: EventBus
): Router => {
  const router = Router();

  // Initialize repositories
  const expenseRepository = new ExpenseRepository(prisma);
  const budgetRepository = new BudgetRepository(prisma);
  const bankConnectionRepository = new BankConnectionRepository(prisma);
  const bankAccountRepository = new BankAccountRepository(prisma);
  const bankTransactionRepository = new BankTransactionRepository(prisma);
  const categorizationRuleRepository = new CategorizationRuleRepository(prisma);
  const transactionClassificationRepository = new TransactionClassificationRepository(prisma);

  // Initialize services
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
  const encryptionService = new EncryptionService(encryptionKey);

  // Bank integration is optional - only initialize if credentials are configured
  const hasBankCredentials = !!(process.env.IBANITY_PONTO_CLIENT_ID || process.env.IBANITY_ISABEL_CLIENT_ID);
  const ibanityService = hasBankCredentials ? createIbanityApiService() : null;

  const categorizationService = new CategorizationService({
    getRulesByUserId: (userId) => categorizationRuleRepository.findActiveByUserId(userId),
    getClassificationsByUserId: (userId, limit) => transactionClassificationRepository.findByUserId(userId, limit),
    saveClassification: (classification) => transactionClassificationRepository.create(classification),
  });

  // Initialize use cases
  const createExpenseUseCase = new CreateExpenseUseCase(
    expenseRepository,
    eventBus
  );
  const getTodayBudgetUseCase = new GetTodayBudgetUseCase(
    budgetRepository,
    expenseRepository
  );
  const checkAffordabilityUseCase = new CheckAffordabilityUseCase(
    budgetRepository,
    expenseRepository
  );
  const getEnvelopesUseCase = new GetEnvelopesUseCase(
    budgetRepository,
    expenseRepository
  );

  // Initialize controllers
  const expenseController = new ExpenseController(createExpenseUseCase);
  const budgetController = new BudgetController(
    getTodayBudgetUseCase,
    checkAffordabilityUseCase,
    getEnvelopesUseCase
  );

  // Mount core routes (always available, protected with authentication)
  router.use('/expenses', authenticate, createExpenseRoutes(expenseController));
  router.use('/budget', authenticate, createBudgetRoutes(budgetController));

  // Bank integration features (only if credentials configured)
  if (ibanityService) {
    // Bank integration use cases
    const connectBankUseCase = new ConnectBankUseCase(
      bankConnectionRepository,
      ibanityService,
      encryptionService,
      eventBus
    );
    const syncBankDataUseCase = new SyncBankDataUseCase(
      bankConnectionRepository,
      bankAccountRepository,
      bankTransactionRepository,
      ibanityService,
      encryptionService,
      eventBus
    );
    const disconnectBankUseCase = new DisconnectBankUseCase(
      bankConnectionRepository,
      ibanityService,
      encryptionService,
      eventBus
    );
    const reconcileTransactionUseCase = new ReconcileTransactionUseCase(
      bankTransactionRepository,
      expenseRepository,
      eventBus
    );

    // Categorization use cases
    const suggestCategoryUseCase = new SuggestCategoryUseCase(
      bankTransactionRepository,
      categorizationService,
      eventBus
    );
    const provideFeedbackUseCase = new ProvideFeedbackUseCase(
      categorizationService,
      eventBus
    );
    const createRuleUseCase = new CreateCategorizationRuleUseCase(
      categorizationRuleRepository,
      eventBus
    );

    // Bank integration controllers
    const bankConnectionController = new BankConnectionController(
      connectBankUseCase,
      syncBankDataUseCase,
      disconnectBankUseCase
    );
    const bankAccountController = new BankAccountController();
    const bankTransactionController = new BankTransactionController(
      reconcileTransactionUseCase
    );

    // Categorization controller
    const categorizationController = new CategorizationController(
      suggestCategoryUseCase,
      provideFeedbackUseCase,
      createRuleUseCase
    );

    // Mount bank routes (protected with authentication)
    router.use('/bank', authenticate, createBankRoutes(
      bankConnectionController,
      bankAccountController,
      bankTransactionController
    ));
    router.use('/categorization', authenticate, createCategorizationRoutes(categorizationController));
  }

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      module: 'finance',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};

export * from './expense.routes';
export * from './budget.routes';
export * from './bank.routes';
export * from './categorization.routes';
