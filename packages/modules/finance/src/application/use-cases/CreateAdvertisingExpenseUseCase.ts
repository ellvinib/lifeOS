/**
 * CreateAdvertisingExpense Use Case
 *
 * Creates a new advertising expense with metrics tracking.
 * Follows the 6-step use case pattern.
 *
 * @module Finance
 */

import { v4 as uuidv4 } from 'uuid';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError, NotFoundError } from '@lifeos/core/shared/errors';
import { IEventPublisher } from '@lifeos/core/events';
import { IAdvertisingExpenseRepository } from '../../domain/interfaces/IAdvertisingExpenseRepository';
import { IAdvertisingCampaignRepository } from '../../domain/interfaces/IAdvertisingCampaignRepository';
import { AdvertisingExpense } from '../../domain/entities/AdvertisingExpense';
import { Platform, AdType } from '../../domain/value-objects/AdvertisingEnums';

/**
 * Input DTO for CreateAdvertisingExpense use case
 */
export interface CreateAdvertisingExpenseInput {
  campaignId: string;
  date: Date;
  amount: number;
  currency?: string;
  platform: Platform;
  adType: AdType;
  description?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
  targetAudience?: string;
  ageRange?: string;
  location?: string;
  creativeUrl?: string;
  landingPageUrl?: string;
  notes?: string;
  tags?: string[];
}

/**
 * CreateAdvertisingExpense use case
 */
export class CreateAdvertisingExpenseUseCase {
  constructor(
    private readonly expenseRepository: IAdvertisingExpenseRepository,
    private readonly campaignRepository: IAdvertisingCampaignRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Execute the use case
   *
   * @param input - Expense creation data
   * @returns Result with created expense or error
   */
  async execute(input: CreateAdvertisingExpenseInput): Promise<Result<AdvertisingExpense, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Validate business rules (campaign exists)
    const businessRulesResult = await this.validateBusinessRules(input);
    if (businessRulesResult.isFail()) {
      return businessRulesResult;
    }

    // Step 3: Create domain entity
    const expense = this.createExpenseEntity(input);

    // Step 4: Persist to repository
    const saveResult = await this.expenseRepository.create(expense);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 5: Publish domain event
    await this.publishExpenseCreatedEvent(expense);

    // Step 6: Return result
    return Result.ok(expense);
  }

  /**
   * Step 1: Validate input
   */
  private validateInput(input: CreateAdvertisingExpenseInput): Result<void, ValidationError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.campaignId || input.campaignId.trim().length === 0) {
      errors.push({ field: 'campaignId', message: 'Campaign ID is required' });
    }

    if (!input.date) {
      errors.push({ field: 'date', message: 'Date is required' });
    }

    if (input.amount === undefined || input.amount < 0) {
      errors.push({ field: 'amount', message: 'Amount must be a non-negative number' });
    }

    if (!input.platform) {
      errors.push({ field: 'platform', message: 'Platform is required' });
    }

    if (!input.adType) {
      errors.push({ field: 'adType', message: 'Ad type is required' });
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

    // Logical validation
    if (
      input.impressions !== undefined &&
      input.clicks !== undefined &&
      input.clicks > input.impressions
    ) {
      errors.push({ field: 'clicks', message: 'Clicks cannot exceed impressions' });
    }

    if (
      input.clicks !== undefined &&
      input.conversions !== undefined &&
      input.conversions > input.clicks
    ) {
      errors.push({ field: 'conversions', message: 'Conversions cannot exceed clicks' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid expense input', errors));
    }

    return Result.ok(undefined);
  }

  /**
   * Step 2: Validate business rules
   */
  private async validateBusinessRules(input: CreateAdvertisingExpenseInput): Promise<Result<void, BaseError>> {
    // Business rule: Campaign must exist
    const campaignResult = await this.campaignRepository.findById(input.campaignId);
    if (campaignResult.isFail()) {
      return Result.fail(
        new NotFoundError('Campaign', input.campaignId)
      );
    }

    const campaign = campaignResult.value;

    // Business rule: Expense date should be within campaign date range
    if (input.date < campaign.startDate) {
      return Result.fail(
        new BusinessRuleError(
          'Expense date cannot be before campaign start date',
          'EXPENSE_DATE_BEFORE_CAMPAIGN'
        )
      );
    }

    if (campaign.endDate && input.date > campaign.endDate) {
      return Result.fail(
        new BusinessRuleError(
          'Expense date cannot be after campaign end date',
          'EXPENSE_DATE_AFTER_CAMPAIGN'
        )
      );
    }

    // Business rule: Expense date cannot be in the future
    const now = new Date();
    if (input.date > now) {
      return Result.fail(
        new BusinessRuleError(
          'Expense date cannot be in the future',
          'EXPENSE_DATE_IN_FUTURE'
        )
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Step 3: Create domain entity
   */
  private createExpenseEntity(input: CreateAdvertisingExpenseInput): AdvertisingExpense {
    const now = new Date();

    return new AdvertisingExpense({
      id: uuidv4(),
      campaignId: input.campaignId,
      date: input.date,
      amount: input.amount,
      currency: input.currency || 'EUR',
      platform: input.platform,
      adType: input.adType,
      description: input.description,
      impressions: input.impressions,
      clicks: input.clicks,
      conversions: input.conversions,
      revenue: input.revenue,
      targetAudience: input.targetAudience,
      ageRange: input.ageRange,
      location: input.location,
      creativeUrl: input.creativeUrl,
      landingPageUrl: input.landingPageUrl,
      notes: input.notes,
      tags: input.tags || [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Step 5: Publish domain event
   */
  private async publishExpenseCreatedEvent(expense: AdvertisingExpense): Promise<void> {
    await this.eventPublisher.publish({
      type: 'AdvertisingExpenseCreated',
      source: 'finance',
      payload: {
        expenseId: expense.id,
        campaignId: expense.campaignId,
        amount: expense.amount,
        platform: expense.platform,
        adType: expense.adType,
        date: expense.date,
      },
      metadata: {},
    });
  }
}
