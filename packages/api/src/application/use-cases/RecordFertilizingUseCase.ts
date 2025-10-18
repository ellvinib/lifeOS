/**
 * Record Fertilizing Use Case
 *
 * Business logic for recording a plant fertilizing event.
 *
 * Design principles:
 * - Single Responsibility: Only handles fertilizing record
 * - Business logic HERE: Validation, domain logic, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import { Result, BusinessRuleError } from '@lifeos/core';
import type { IPlantRepository, Plant, EventBus, BaseError } from '@lifeos/core';

/**
 * Record Fertilizing Use Case.
 *
 * Records fertilizing event for a plant and publishes domain event.
 */
export class RecordFertilizingUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param plantId - ID of plant to fertilize
   * @param fertilizedDate - Date of fertilizing (defaults to now)
   * @returns Result with updated plant or error
   */
  async execute(plantId: string, fertilizedDate?: Date): Promise<Result<Plant, BaseError>> {
    // 1. Get plant
    const plantResult = await this.plantRepository.findById(plantId);
    if (plantResult.isFail()) {
      return plantResult;
    }

    const plant = plantResult.value;

    // 2. Validate business rules
    const validationResult = this.validateBusinessRules(plant, fertilizedDate);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 3. Record fertilizing (domain logic)
    plant.recordFertilizing(fertilizedDate);

    // 4. Persist updated plant
    const updateResult = await this.plantRepository.update(plant);
    if (updateResult.isFail()) {
      return updateResult;
    }

    const updatedPlant = updateResult.value;

    // 5. Publish domain event
    await this.publishPlantFertilizedEvent(updatedPlant, fertilizedDate);

    // 6. Return result
    return Result.ok(updatedPlant);
  }

  /**
   * Validate business rules for fertilizing.
   */
  private validateBusinessRules(plant: Plant, fertilizedDate?: Date): Result<void, BaseError> {
    // Check if plant is active
    if (!plant.isActive) {
      return Result.fail(
        new BusinessRuleError('Cannot fertilize inactive plant', {
          plantId: plant.id,
          isActive: plant.isActive,
        })
      );
    }

    // Check if fertilized date is not in the future
    const dateToCheck = fertilizedDate || new Date();
    if (dateToCheck > new Date()) {
      return Result.fail(
        new BusinessRuleError('Fertilized date cannot be in the future', {
          plantId: plant.id,
          fertilizedDate: dateToCheck,
        })
      );
    }

    // Check if fertilized date is not before planted date
    if (dateToCheck < plant.plantedDate) {
      return Result.fail(
        new BusinessRuleError('Fertilized date cannot be before planted date', {
          plantId: plant.id,
          fertilizedDate: dateToCheck,
          plantedDate: plant.plantedDate,
        })
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Publish PlantFertilized domain event.
   */
  private async publishPlantFertilizedEvent(plant: Plant, fertilizedDate?: Date): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlantFertilized',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        plantId: plant.id,
        plantName: plant.name,
        fertilizedDate: fertilizedDate || new Date(),
        previousFertilizedDate: plant.lastFertilized,
      },
      metadata: {},
      version: 1,
    });
  }
}
