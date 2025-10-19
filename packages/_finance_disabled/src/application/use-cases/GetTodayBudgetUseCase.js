"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTodayBudgetUseCase = void 0;
const result_1 = require("@lifeOS/core/shared/result");
class GetTodayBudgetUseCase {
    budgetRepository;
    expenseRepository;
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
            return result_1.Result.ok({
                remainingToday: 0,
                dailyLimit: 0,
                spentToday: 0,
                percentUsed: 0,
                totalBudget: 0,
                spentThisMonth: 0,
                daysInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
                dayOfMonth: new Date().getDate(),
                onTrack: true,
                projectedEndOfMonthTotal: 0,
            });
        }
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOfToday = new Date(year, month, dayOfMonth, 0, 0, 0);
        const endOfToday = new Date(year, month, dayOfMonth, 23, 59, 59);
        const startOfMonth = new Date(year, month, 1, 0, 0, 0);
        const todayExpensesResult = await this.expenseRepository.findAll({
            userId,
            startDate: startOfToday,
            endDate: endOfToday,
        });
        if (todayExpensesResult.isFail()) {
            return todayExpensesResult;
        }
        const spentToday = todayExpensesResult.value.reduce((sum, expense) => sum + expense.amount, 0);
        const monthExpensesResult = await this.expenseRepository.getTotalForPeriod(startOfMonth, now, userId);
        if (monthExpensesResult.isFail()) {
            return monthExpensesResult;
        }
        const spentThisMonth = monthExpensesResult.value;
        const totalBudget = budget.getTotalPlanned();
        const dailyLimit = totalBudget / daysInMonth;
        const remainingToday = Math.max(0, dailyLimit - spentToday);
        const percentUsed = dailyLimit > 0 ? (spentToday / dailyLimit) * 100 : 0;
        const expectedSpendingByNow = dailyLimit * dayOfMonth;
        const onTrack = spentThisMonth <= expectedSpendingByNow;
        const daysRemaining = daysInMonth - dayOfMonth;
        const averageDailySpending = spentThisMonth / dayOfMonth;
        const projectedEndOfMonthTotal = spentThisMonth + (averageDailySpending * daysRemaining);
        return result_1.Result.ok({
            remainingToday: Math.round(remainingToday * 100) / 100,
            dailyLimit: Math.round(dailyLimit * 100) / 100,
            spentToday: Math.round(spentToday * 100) / 100,
            percentUsed: Math.round(percentUsed),
            totalBudget: Math.round(totalBudget * 100) / 100,
            spentThisMonth: Math.round(spentThisMonth * 100) / 100,
            daysInMonth,
            dayOfMonth,
            onTrack,
            projectedEndOfMonthTotal: Math.round(projectedEndOfMonthTotal * 100) / 100,
        });
    }
}
exports.GetTodayBudgetUseCase = GetTodayBudgetUseCase;
//# sourceMappingURL=GetTodayBudgetUseCase.js.map