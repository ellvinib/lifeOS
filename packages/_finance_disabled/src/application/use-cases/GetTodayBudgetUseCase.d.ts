import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { IExpenseRepository, IBudgetRepository } from '../../domain/interfaces';
export interface TodayBudgetOutput {
    remainingToday: number;
    dailyLimit: number;
    spentToday: number;
    percentUsed: number;
    totalBudget: number;
    spentThisMonth: number;
    daysInMonth: number;
    dayOfMonth: number;
    onTrack: boolean;
    projectedEndOfMonthTotal: number;
}
export declare class GetTodayBudgetUseCase {
    private readonly budgetRepository;
    private readonly expenseRepository;
    constructor(budgetRepository: IBudgetRepository, expenseRepository: IExpenseRepository);
    execute(userId: string): Promise<Result<TodayBudgetOutput, BaseError>>;
}
//# sourceMappingURL=GetTodayBudgetUseCase.d.ts.map