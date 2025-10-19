import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { IExpenseRepository, IBudgetRepository } from '../../domain/interfaces';
import { ExpenseCategory } from '../../domain/entities';
export interface EnvelopeOutput {
    category: ExpenseCategory;
    name: string;
    emoji: string;
    planned: number;
    spent: number;
    remaining: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
    recentTransactions: Array<{
        date: Date;
        description: string;
        amount: number;
        merchantName?: string;
    }>;
}
export interface EnvelopesOutput {
    envelopes: EnvelopeOutput[];
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    month: string;
}
export declare class GetEnvelopesUseCase {
    private readonly budgetRepository;
    private readonly expenseRepository;
    private readonly categoryConfig;
    constructor(budgetRepository: IBudgetRepository, expenseRepository: IExpenseRepository);
    execute(userId: string): Promise<Result<EnvelopesOutput, BaseError>>;
}
//# sourceMappingURL=GetEnvelopesUseCase.d.ts.map