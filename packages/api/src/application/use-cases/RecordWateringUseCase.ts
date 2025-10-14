/**
 * Record Watering Use Case
 *
 * Business logic for recording a plant watering event.
 *
 * Design principles:
 * - Single Responsibility: Only handles watering record
 * - Business logic HERE: Validation, domain logic, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import type { IPlantRepository, Plant, EventBus, Result, BaseError } from '@lifeos/core';
import { BusinessRuleError } from '@lifeos/core';

/**
 * Record Watering Use Case.
 *
 * Records watering event for a plant and publishes domain event.
 */
export class RecordWateringUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param plantId - ID of plant to water
   * @param wateredDate - Date of watering (defaults to now)
   * @returns Result with updated plant or error
   */
  async execute(plantId: string, wateredDate?: Date): Promise<Result<Plant, BaseError>> {
    // 1. Get plant
    const plantResult = await this.plantRepository.findById(plantId);
    if (plantResult.isFail()) {
      return plantResult;
    }

    const plant = plantResult.value;

    // 2. Validate business rules
    const validationResult = this.validateBusinessRules(plant, wateredDate);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 3. Record watering (domain logic)
    plant.recordWatering(wateredDate);

    // 4. Persist updated plant
    const updateResult = await this.plantRepository.update(plant);
    if (updateResult.isFail()) {
      return updateResult;
    }

    const updatedPlant = updateResult.value;

    // 5. Publish domain event
    await this.publishPlantWateredEvent(updatedPlant, wateredDate);

    // 6. Return result
    return Result.ok(updatedPlant);
  }

  /**
   * Validate business rules for watering.
   */
  private validateBusinessRules(plant: Plant, wateredDate?: Date): Result<void, BaseError> {
    // Check if plant is active
    if (!plant.isActive) {
      return Result.fail(
        new BusinessRuleError('Cannot water inactive plant', {
          plantId: plant.id,
          isActive: plant.isActive,
        })
      );
    }

    // Check if watered date is not in the future
    const dateToCheck = wateredDate || new Date();
    if (dateToCheck > new Date()) {
      return Result.fail(
        new BusinessRuleError('Watered date cannot be in the future', {
          plantId: plant.id,
          wateredDate: dateToCheck,
        })
      );
    }

    // Check if watered date is not before planted date
    if (dateToCheck < plant.plantedDate) {
      return Result.fail(
        new BusinessRuleError('Watered date cannot be before planted date', {
          plantId: plant.id,
          wateredDate: dateToCheck,
          plantedDate: plant.plantedDate,
        })
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Publish PlantWatered domain event.
   */
  private async publishPlantWateredEvent(plant: Plant, wateredDate?: Date): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlantWatered',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        plantId: plant.id,
        plantName: plant.name,
        wateredDate: wateredDate || new Date(),
        previousWateredDate: plant.lastWatered,
        wateringFrequency: plant.wateringFrequency,
      },
      metadata: {},
      version: 1,
    });
  }
}
