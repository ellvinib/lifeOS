/**
 * Finance Module Seed Data
 *
 * Creates sample budget and expense data for testing the Finance dashboard.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Finance module data...');

  // Get current month in YYYY-MM format
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  console.log(`Creating budget for ${currentMonth}...`);

  // Create monthly budget
  const budget = await prisma.financeBudget.upsert({
    where: { month: currentMonth },
    update: {},
    create: {
      name: `Budget ${currentMonth}`,
      month: currentMonth,
      totalIncome: 5000.0,
      savingsGoal: 1000.0,
      metadata: {},
    },
  });

  console.log(`✓ Budget created: ${budget.id}`);

  // Create budget categories with Dutch names and emojis
  const categories = [
    { category: 'housing', plannedAmount: 1200.0 },
    { category: 'utilities', plannedAmount: 150.0 },
    { category: 'groceries', plannedAmount: 400.0 },
    { category: 'transportation', plannedAmount: 200.0 },
    { category: 'healthcare', plannedAmount: 100.0 },
    { category: 'insurance', plannedAmount: 150.0 },
    { category: 'entertainment', plannedAmount: 200.0 },
    { category: 'dining', plannedAmount: 150.0 },
    { category: 'shopping', plannedAmount: 200.0 },
    { category: 'education', plannedAmount: 100.0 },
    { category: 'savings', plannedAmount: 500.0 },
    { category: 'other', plannedAmount: 150.0 },
  ];

  for (const cat of categories) {
    await prisma.financeBudgetCategory.upsert({
      where: {
        budgetId_category: {
          budgetId: budget.id,
          category: cat.category,
        },
      },
      update: {
        plannedAmount: cat.plannedAmount,
      },
      create: {
        budgetId: budget.id,
        category: cat.category,
        plannedAmount: cat.plannedAmount,
        spentAmount: 0,
      },
    });
  }

  console.log(`✓ Created ${categories.length} budget categories`);

  // Create sample expenses for this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const expenses = [
    // Housing
    {
      description: 'Rent payment',
      amount: 1200.0,
      category: 'housing',
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      paymentMethod: 'bank_transfer',
      merchantName: 'Property Management',
    },
    // Utilities
    {
      description: 'Electricity bill',
      amount: 80.0,
      category: 'utilities',
      date: new Date(now.getFullYear(), now.getMonth(), 2),
      paymentMethod: 'bank_transfer',
      merchantName: 'Energy Company',
    },
    // Groceries
    {
      description: 'Albert Heijn',
      amount: 45.32,
      category: 'groceries',
      date: new Date(now.getFullYear(), now.getMonth(), 3),
      paymentMethod: 'debit_card',
      merchantName: 'Albert Heijn',
    },
    {
      description: 'Jumbo Supermarkt',
      amount: 62.15,
      category: 'groceries',
      date: new Date(now.getFullYear(), now.getMonth(), 6),
      paymentMethod: 'debit_card',
      merchantName: 'Jumbo',
    },
    {
      description: 'Aldi',
      amount: 38.90,
      category: 'groceries',
      date: new Date(now.getFullYear(), now.getMonth(), 9),
      paymentMethod: 'debit_card',
      merchantName: 'Aldi',
    },
    // Transportation
    {
      description: 'NS Train ticket',
      amount: 45.0,
      category: 'transportation',
      date: new Date(now.getFullYear(), now.getMonth(), 4),
      paymentMethod: 'debit_card',
      merchantName: 'NS',
    },
    {
      description: 'Shell fuel',
      amount: 65.50,
      category: 'transportation',
      date: new Date(now.getFullYear(), now.getMonth(), 7),
      paymentMethod: 'credit_card',
      merchantName: 'Shell',
    },
    // Healthcare
    {
      description: 'Pharmacy - medication',
      amount: 23.50,
      category: 'healthcare',
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      paymentMethod: 'debit_card',
      merchantName: 'Apotheek',
    },
    // Entertainment
    {
      description: 'Netflix subscription',
      amount: 13.99,
      category: 'entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      paymentMethod: 'credit_card',
      merchantName: 'Netflix',
    },
    {
      description: 'Cinema tickets',
      amount: 28.0,
      category: 'entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      paymentMethod: 'debit_card',
      merchantName: 'Pathé',
    },
    // Dining
    {
      description: 'Restaurant dinner',
      amount: 67.50,
      category: 'dining',
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      paymentMethod: 'credit_card',
      merchantName: 'De Kas',
    },
    {
      description: 'Coffee shop',
      amount: 8.50,
      category: 'dining',
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      paymentMethod: 'cash',
      merchantName: 'Starbucks',
    },
    // Shopping
    {
      description: 'H&M clothes',
      amount: 89.99,
      category: 'shopping',
      date: new Date(now.getFullYear(), now.getMonth(), 6),
      paymentMethod: 'debit_card',
      merchantName: 'H&M',
    },
    // Today's expenses (for testing today's budget)
    {
      description: 'Lunch at work',
      amount: 12.50,
      category: 'dining',
      date: now,
      paymentMethod: 'debit_card',
      merchantName: 'Lunch Corner',
    },
    {
      description: 'Coffee',
      amount: 4.20,
      category: 'dining',
      date: now,
      paymentMethod: 'cash',
      merchantName: 'Coffee Company',
    },
  ];

  for (const expense of expenses) {
    await prisma.financeExpense.create({
      data: {
        ...expense,
        isRecurring: false,
        notes: '',
        tags: [],
        metadata: {},
      },
    });
  }

  console.log(`✓ Created ${expenses.length} sample expenses`);

  // Update budget categories with spent amounts
  console.log('Updating budget category spent amounts...');

  for (const cat of categories) {
    // Calculate total spent for this category this month
    const spent = await prisma.financeExpense.aggregate({
      where: {
        category: cat.category,
        date: {
          gte: startOfMonth,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const spentAmount = spent._sum.amount || 0;

    await prisma.financeBudgetCategory.update({
      where: {
        budgetId_category: {
          budgetId: budget.id,
          category: cat.category,
        },
      },
      data: {
        spentAmount: spentAmount,
      },
    });
  }

  console.log('✓ Updated category spent amounts');
  console.log('\n🎉 Finance module seed completed successfully!');
  console.log(`\nBudget Summary for ${currentMonth}:`);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  console.log(`  Total Income: €${budget.totalIncome.toFixed(2)}`);
  console.log(`  Total Planned: €${categories.reduce((sum, c) => sum + c.plannedAmount, 0).toFixed(2)}`);
  console.log(`  Total Spent: €${totalSpent.toFixed(2)}`);
  console.log(`  Savings Goal: €${budget.savingsGoal.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding Finance data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
