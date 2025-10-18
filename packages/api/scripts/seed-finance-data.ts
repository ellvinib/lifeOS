import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/infrastructure/auth/AuthService';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const authService = new AuthService();

async function seedFinanceData() {
  console.log('🌱 Seeding finance data...\n');

  try {
    // 1. Create test user
    console.log('1️⃣  Creating test user...');
    const passwordResult = await authService.hashPassword('Password123');
    if (passwordResult.isFail()) {
      console.error('Password validation errors:', passwordResult.error);
      throw new Error('Failed to hash password');
    }

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: passwordResult.value,
      },
    });
    console.log(`   ✅ User created: ${user.email} (ID: ${user.id})\n`);

    // 2. Generate access token
    console.log('2️⃣  Generating access token...');
    const tokenResult = authService.generateTokenPair(user.id, user.email);
    if (tokenResult.isFail()) {
      throw new Error('Failed to generate token');
    }
    const accessToken = tokenResult.value.accessToken;
    console.log(`   ✅ Access Token generated\n`);

    // 3. Create budget for current month
    console.log('3️⃣  Creating budget for current month...');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budget = await prisma.financeBudget.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        name: 'Monthly Budget',
        month: currentMonth,
        totalIncome: 3500,
        savingsGoal: 500,
        metadata: {},
        categories: {
          create: [
            { category: 'housing', plannedAmount: 1000, spentAmount: 0 },
            { category: 'utilities', plannedAmount: 150, spentAmount: 0 },
            { category: 'groceries', plannedAmount: 400, spentAmount: 0 },
            { category: 'transportation', plannedAmount: 200, spentAmount: 0 },
            { category: 'healthcare', plannedAmount: 100, spentAmount: 0 },
            { category: 'entertainment', plannedAmount: 300, spentAmount: 0 },
            { category: 'dining', plannedAmount: 250, spentAmount: 0 },
            { category: 'shopping', plannedAmount: 200, spentAmount: 0 },
            { category: 'other', plannedAmount: 400, spentAmount: 0 },
          ],
        },
      },
      include: { categories: true },
    });
    console.log(`   ✅ Budget created for ${currentMonth}`);
    console.log(`   📊 Total Income: €${budget.totalIncome}`);
    console.log(`   💰 Savings Goal: €${budget.savingsGoal}`);
    console.log(`   📦 Categories: ${budget.categories.length}\n`);

    // 4. Create test expenses
    console.log('4️⃣  Creating test expenses...');
    const expenses = [
      {
        description: 'Rent Payment',
        amount: 1000,
        category: 'housing',
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        paymentMethod: 'bank_transfer',
        merchantName: 'Property Manager',
      },
      {
        description: 'Electricity Bill',
        amount: 75,
        category: 'utilities',
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        paymentMethod: 'debit_card',
        merchantName: 'Energy Provider',
      },
      {
        description: 'Weekly Groceries',
        amount: 120,
        category: 'groceries',
        date: new Date(now.getFullYear(), now.getMonth(), 7),
        paymentMethod: 'debit_card',
        merchantName: 'Supermarket',
      },
      {
        description: 'Gas Station',
        amount: 60,
        category: 'transportation',
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        paymentMethod: 'credit_card',
        merchantName: 'Shell',
      },
      {
        description: 'Movie Tickets',
        amount: 30,
        category: 'entertainment',
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        paymentMethod: 'credit_card',
        merchantName: 'Cinema',
      },
      {
        description: 'Restaurant Dinner',
        amount: 85,
        category: 'dining',
        date: new Date(now.getFullYear(), now.getMonth(), 14),
        paymentMethod: 'credit_card',
        merchantName: 'Italian Restaurant',
      },
      {
        description: 'Weekly Groceries',
        amount: 110,
        category: 'groceries',
        date: new Date(now.getFullYear(), now.getMonth(), 14),
        paymentMethod: 'debit_card',
        merchantName: 'Supermarket',
      },
    ];

    for (const expense of expenses) {
      await prisma.financeExpense.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          paymentMethod: expense.paymentMethod,
          merchantName: expense.merchantName,
          isRecurring: false,
          tags: [],
          metadata: {},
        },
      });
      console.log(`   ✅ ${expense.description} - €${expense.amount}`);
    }

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`\n   📈 Total expenses created: ${expenses.length}`);
    console.log(`   💸 Total spent: €${totalSpent}\n`);

    // 5. Summary
    console.log('=' .repeat(60));
    console.log('✨ Seed completed successfully!\n');
    console.log('📋 Test Data Summary:');
    console.log(`   User: ${user.email}`);
    console.log(`   Password: Password123`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Budget Month: ${currentMonth}`);
    console.log(`   Total Income: €${budget.totalIncome}`);
    console.log(`   Total Spent: €${totalSpent}`);
    console.log(`   Remaining: €${budget.totalIncome - totalSpent}\n`);

    console.log('🔑 Access Token (valid for 7 days):');
    console.log(`   ${accessToken}\n`);

    console.log('📡 Test the API:');
    console.log('   1. Get today\'s budget:');
    console.log(`      curl -H "Authorization: Bearer ${accessToken}" http://localhost:4000/api/finance/budget/today\n`);
    console.log('   2. Get envelopes:');
    console.log(`      curl -H "Authorization: Bearer ${accessToken}" http://localhost:4000/api/finance/budget/envelopes\n`);
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedFinanceData();
