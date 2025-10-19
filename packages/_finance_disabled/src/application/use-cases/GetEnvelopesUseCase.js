"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEnvelopesUseCase = void 0;
const result_1 = require("@lifeOS/core/shared/result");
class GetEnvelopesUseCase {
    budgetRepository;
    expenseRepository;
    categoryConfig = {
        housing: { name: 'Wonen', emoji: '🏠' },
        utilities: { name: 'Utilities', emoji: '💡' },
        groceries: { name: 'Boodschappen', emoji: '🛒' },
        transportation: { name: 'Transport', emoji: '🚗' },
        healthcare: { name: 'Zorgkosten', emoji: '🏥' },
        insurance: { name: 'Verzekeringen', emoji: '🛡️' },
        entertainment: { name: 'Vrije tijd', emoji: '🎬' },
        dining: { name: 'Uit eten', emoji: '🍽️' },
        shopping: { name: 'Shopping', emoji: '🛍️' },
        education: { name: 'Educatie', emoji: '📚' },
        savings: { name: 'Sparen', emoji: '💰' },
        debt_payment: { name: 'Schulden', emoji: '💳' },
        investments: { name: 'Beleggen', emoji: '📈' },
        gifts: { name: 'Cadeaus', emoji: '🎁' },
        other: { name: 'Overig', emoji: '📦' },
    };
    constructor(budgetRepository, expenseRepository) {
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
    }
    async execute(userId) {
        const budgetResult = await this.budgetRepository.getCurrentMonth(userId);
        if (budgetResult.isFail()) {
            return budgetResult;
        }
        const budget = budgetResult.value;
        if (!budget) {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            return result_1.Result.ok({
                envelopes: [],
                totalBudget: 0,
                totalSpent: 0,
                totalRemaining: 0,
                month,
            });
        }
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const startOfMonth = new Date(year, month, 1, 0, 0, 0);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        const categories = budget.getAllCategories();
        const envelopes = [];
        for (const categoryBudget of categories) {
            const spendingResult = await this.expenseRepository.getTotalByCategory(categoryBudget.category, startOfMonth, endOfMonth, userId);
            if (spendingResult.isFail()) {
                return spendingResult;
            }
            const spent = spendingResult.value;
            const remaining = categoryBudget.plannedAmount - spent;
            const percentage = categoryBudget.plannedAmount > 0
                ? (spent / categoryBudget.plannedAmount) * 100
                : 0;
            let status;
            if (percentage >= 100) {
                status = 'danger';
            }
            else if (percentage >= 85) {
                status = 'warning';
            }
            else {
                status = 'good';
            }
            const transactionsResult = await this.expenseRepository.findAll({
                userId,
                category: categoryBudget.category,
                startDate: startOfMonth,
                endDate: endOfMonth,
                limit: 5,
            });
            if (transactionsResult.isFail()) {
                return transactionsResult;
            }
            const recentTransactions = transactionsResult.value.map(expense => ({
                date: expense.date,
                description: expense.description,
                amount: expense.amount,
                merchantName: expense.merchantName,
            }));
            const config = this.categoryConfig[categoryBudget.category];
            envelopes.push({
                category: categoryBudget.category,
                name: config.name,
                emoji: config.emoji,
                planned: Math.round(categoryBudget.plannedAmount * 100) / 100,
                spent: Math.round(spent * 100) / 100,
                remaining: Math.round(remaining * 100) / 100,
                percentage: Math.round(percentage),
                status,
                recentTransactions,
            });
        }
        envelopes.sort((a, b) => {
            const statusOrder = { danger: 0, warning: 1, good: 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return b.percentage - a.percentage;
        });
        const totalBudget = budget.getTotalPlanned();
        const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
        const totalRemaining = totalBudget - totalSpent;
        return result_1.Result.ok({
            envelopes,
            totalBudget: Math.round(totalBudget * 100) / 100,
            totalSpent: Math.round(totalSpent * 100) / 100,
            totalRemaining: Math.round(totalRemaining * 100) / 100,
            month: budget.month,
        });
    }
}
exports.GetEnvelopesUseCase = GetEnvelopesUseCase;
//# sourceMappingURL=GetEnvelopesUseCase.js.map