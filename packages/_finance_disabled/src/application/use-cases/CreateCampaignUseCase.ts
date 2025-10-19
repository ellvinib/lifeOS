/**
 * CreateCampaign Use Case
 *
 * Creates a new advertising campaign.
 * Follows the 6-step use case pattern.
 *
 * @module Finance
 */

import { v4 as uuidv4 } from 'uuid';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeos/core/shared/errors';
import { IEventPublisher } from '@lifeos/core/events';
import { IAdvertisingCampaignRepository } from '../../domain/interfaces/IAdvertisingCampaignRepository';
import { AdvertisingCampaign } from '../../domain/entities/AdvertisingCampaign';
import { Platform, CampaignStatus } from '../../domain/value-objects/AdvertisingEnums';

/**
 * Input DTO for CreateCampaign use case
 */
export interface CreateCampaignInput {
  name: string;
  description?: string;
  platform: Platform;
  startDate: Date;
  endDate?: Date;
  totalBudget?: number;
  currency?: string;
  targetAudience?: string;
  objectives?: string[];
  tags?: string[];
}

/**
 * CreateCampaign use case
 */
export class CreateCampaignUseCase {
  constructor(
    private readonly campaignRepository: IAdvertisingCampaignRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Execute the use case
   *
   * @param input - Campaign creation data
   * @returns Result with created campaign or error
   */
  async execute(input: CreateCampaignInput): Promise<Result<AdvertisingCampaign, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Validate business rules
    const businessRulesResult = this.validateBusinessRules(input);
    if (businessRulesResult.isFail()) {
      return businessRulesResult;
    }

    // Step 3: Create domain entity
    const campaign = this.createCampaignEntity(input);

    // Step 4: Persist to repository
    const saveResult = await this.campaignRepository.create(campaign);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 5: Publish domain event
    await this.publishCampaignCreatedEvent(campaign);

    // Step 6: Return result
    return Result.ok(campaign);
  }

  /**
   * Step 1: Validate input
   */
  private validateInput(input: CreateCampaignInput): Result<void, ValidationError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Campaign name is required' });
    }

    if (input.name && input.name.length > 255) {
      errors.push({ field: 'name', message: 'Campaign name must be less than 255 characters' });
    }

    if (!input.platform) {
      errors.push({ field: 'platform', message: 'Platform is required' });
    }

    if (!input.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required' });
    }

    if (input.totalBudget !== undefined && input.totalBudget < 0) {
      errors.push({ field: 'totalBudget', message: 'Budget cannot be negative' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid campaign input', errors));
    }

    return Result.ok(undefined);
  }

  /**
   * Step 2: Validate business rules
   */
  private validateBusinessRules(input: CreateCampaignInput): Result<void, BusinessRuleError> {
    // Business rule: End date must be after start date
    if (input.endDate && input.endDate < input.startDate) {
      return Result.fail(
        new BusinessRuleError(
          'End date cannot be before start date',
          'INVALID_DATE_RANGE'
        )
      );
    }

    // Business rule: Start date cannot be too far in the past
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (input.startDate < oneYearAgo) {
      return Result.fail(
        new BusinessRuleError(
          'Start date cannot be more than 1 year in the past',
          'START_DATE_TOO_OLD'
        )
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Step 3: Create domain entity
   */
  private createCampaignEntity(input: CreateCampaignInput): AdvertisingCampaign {
    const now = new Date();

    return new AdvertisingCampaign({
      id: uuidv4(),
      name: input.name,
      description: input.description,
      platform: input.platform,
      status: CampaignStatus.DRAFT,
      startDate: input.startDate,
      endDate: input.endDate,
      totalBudget: input.totalBudget,
      currency: input.currency || 'EUR',
      targetAudience: input.targetAudience,
      objectives: input.objectives || [],
      tags: input.tags || [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Step 5: Publish domain event
   */
  private async publishCampaignCreatedEvent(campaign: AdvertisingCampaign): Promise<void> {
    await this.eventPublisher.publish({
      type: 'CampaignCreated',
      source: 'finance',
      payload: {
        campaignId: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        startDate: campaign.startDate,
        totalBudget: campaign.totalBudget,
      },
      metadata: {},
    });
  }
}
