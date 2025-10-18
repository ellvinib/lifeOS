/**
 * Create Plant Use Case
 *
 * Business logic for creating a plant.
 *
 * Design principles:
 * - Single Responsibility: Only handles plant creation
 * - Business logic HERE: Validation, rules, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import { Result, BusinessRuleError, ValidationError } from '@lifeos/core';
import type { IPlantRepository, Plant, EventBus, BaseError } from '@lifeos/core';

/**
 * Create Plant Use Case.
 *
 * Orchestrates plant creation with business rule validation and event publishing.
 */
export class CreatePlantUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param plant - Plant to create
   * @returns Result with created plant or error
   */
  async execute(plant: Plant): Promise<Result<Plant, BaseError>> {
    // 1. Validate business rules
    const validationResult = this.validateBusinessRules(plant);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 2. Persist plant
    const createResult = await this.plantRepository.create(plant);
    if (createResult.isFail()) {
      return createResult;
    }

    const createdPlant = createResult.value;

    // 3. Publish domain event
    await this.publishPlantCreatedEvent(createdPlant);

    // 4. Return result
    return Result.ok(createdPlant);
  }

  /**
   * Validate business rules for plant creation.
   */
  private validateBusinessRules(plant: Plant): Result<void, BaseError> {
    const errors: string[] = [];

    // Name validation
    if (plant.name.length < 2) {
      errors.push('Plant name must be at least 2 characters');
    }

    if (plant.name.length > 200) {
      errors.push('Plant name must not exceed 200 characters');
    }

    // Location validation
    if (plant.location.length < 2) {
      errors.push('Plant location must be at least 2 characters');
    }

    if (plant.location.length > 200) {
      errors.push('Plant location must not exceed 200 characters');
    }

    // Planted date validation
    if (plant.plantedDate > new Date()) {
      errors.push('Planted date cannot be in the future');
    }

    // Expected harvest date validation
    if (plant.expectedHarvestDate && plant.expectedHarvestDate < plant.plantedDate) {
      errors.push('Expected harvest date cannot be before planted date');
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return Result.fail(
        new ValidationError('Plant validation failed', errors.map((msg) => ({ message: msg })))
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Publish PlantCreated domain event.
   */
  private async publishPlantCreatedEvent(plant: Plant): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlantCreated',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        plantId: plant.id,
        name: plant.name,
        type: plant.type,
        location: plant.location,
        areaId: plant.areaId,
      },
      metadata: {},
      version: 1,
    });
  }
}
