/**
 * UpdateExpenseMetrics Use Case
 *
 * Updates performance metrics for an advertising expense.
 * Follows the 6-step use case pattern.
 *
 * @module Finance
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError, NotFoundError } from '@lifeos/core/shared/errors';
import { IEventPublisher } from '@lifeos/core/events';
import { IAdvertisingExpenseRepository } from '../../domain/interfaces/IAdvertisingExpenseRepository';
import { AdvertisingExpense } from '../../domain/entities/AdvertisingExpense';

/**
 * Input DTO for UpdateExpenseMetrics use case
 */
export interface UpdateExpenseMetricsInput {
  expenseId: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
}

/**
 * UpdateExpenseMetrics use case
 */
export class UpdateExpenseMetricsUseCase {
  constructor(
    private readonly expenseRepository: IAdvertisingExpenseRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Execute the use case
   *
   * @param input - Metrics update data
   * @returns Result with updated expense or error
   */
  async execute(input: UpdateExpenseMetricsInput): Promise<Result<AdvertisingExpense, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Get entity
    const expenseResult = await this.expenseRepository.findById(input.expenseId);
    if (expenseResult.isFail()) {
      return Result.fail(new NotFoundError('AdvertisingExpense', input.expenseId));
    }
    const expense = expenseResult.value;

    // Step 3: Call domain method
    try {
      expense.updateMetrics({
        impressions: input.impressions,
        clicks: input.clicks,
        conversions: input.conversions,
        revenue: input.revenue,
      });
    } catch (error: any) {
      return Result.fail(
        new ValidationError(error.message, [
          { field: 'metrics', message: error.message },
        ])
      );
    }

    // Step 4: Persist
    const updateResult = await this.expenseRepository.update(expense);
    if (updateResult.isFail()) {
      return updateResult;
    }

    // Step 5: Publish event
    await this.publishMetricsUpdatedEvent(expense);

    // Step 6: Return result
    return Result.ok(expense);
  }

  /**
   * Step 1: Validate input
   */
  private validateInput(input: UpdateExpenseMetricsInput): Result<void, ValidationError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.expenseId || input.expenseId.trim().length === 0) {
      errors.push({ field: 'expenseId', message: 'Expense ID is required' });
    }

    if (
      input.impressions === undefined &&
      input.clicks === undefined &&
      input.conversions === undefined &&
      input.revenue === undefined
    ) {
      errors.push({
        field: 'metrics',
        message: 'At least one metric must be provided',
      });
    }

    if (input.impressions !== undefined && input.impressions < 0) {
      errors.push({ field: 'impressions', message: 'Impressions cannot be negative' });
    }

    if (input.clicks !== undefined && input.clicks < 0) {
      errors.push({ field: 'clicks', message: 'Clicks cannot be negative' });
    }

    if (input.conversions !== undefined && input.conversions < 0) {
      errors.push({ field: 'conversions', message: 'Conversions cannot be negative' });
    }

    if (input.revenue !== undefined && input.revenue < 0) {
      errors.push({ field: 'revenue', message: 'Revenue cannot be negative' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid metrics data', errors));
    }

    return Result.ok(undefined);
  }

  /**
   * Step 5: Publish domain event
   */
  private async publishMetricsUpdatedEvent(expense: AdvertisingExpense): Promise<void> {
    await this.eventPublisher.publish({
      type: 'AdvertisingExpenseUpdated',
      source: 'finance',
      payload: {
        expenseId: expense.id,
        campaignId: expense.campaignId,
        impressions: expense.impressions,
        clicks: expense.clicks,
        conversions: expense.conversions,
        revenue: expense.revenue,
        roi: expense.roiMetrics.roi,
        roas: expense.roiMetrics.roas,
      },
      metadata: {},
    });

    // Check if ROI threshold is reached (e.g., 100%)
    if (expense.roiMetrics.roi >= 100) {
      await this.eventPublisher.publish({
        type: 'ROIThresholdReached',
        source: 'finance',
        payload: {
          expenseId: expense.id,
          campaignId: expense.campaignId,
          roi: expense.roiMetrics.roi,
          threshold: 100,
        },
        metadata: {},
      });
    }
  }
}
