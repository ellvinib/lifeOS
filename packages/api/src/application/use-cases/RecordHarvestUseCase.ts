/**
 * Record Harvest Use Case
 *
 * Business logic for recording a plant harvest event.
 *
 * Design principles:
 * - Single Responsibility: Only handles harvest record
 * - Business logic HERE: Validation, domain logic, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import type { IPlantRepository, Plant, EventBus, Result, BaseError } from '@lifeos/core';
import { BusinessRuleError } from '@lifeos/core';

/**
 * Record Harvest Use Case.
 *
 * Records harvest event for a plant and publishes domain event.
 */
export class RecordHarvestUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param plantId - ID of plant to harvest
   * @param harvestDate - Date of harvest (defaults to now)
   * @returns Result with updated plant or error
   */
  async execute(plantId: string, harvestDate?: Date): Promise<Result<Plant, BaseError>> {
    // 1. Get plant
    const plantResult = await this.plantRepository.findById(plantId);
    if (plantResult.isFail()) {
      return plantResult;
    }

    const plant = plantResult.value;

    // 2. Validate business rules
    const validationResult = this.validateBusinessRules(plant, harvestDate);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 3. Record harvest (domain logic)
    plant.recordHarvest(harvestDate);

    // 4. Persist updated plant
    const updateResult = await this.plantRepository.update(plant);
    if (updateResult.isFail()) {
      return updateResult;
    }

    const updatedPlant = updateResult.value;

    // 5. Publish domain event
    await this.publishPlantHarvestedEvent(updatedPlant, harvestDate);

    // 6. Return result
    return Result.ok(updatedPlant);
  }

  /**
   * Validate business rules for harvesting.
   */
  private validateBusinessRules(plant: Plant, harvestDate?: Date): Result<void, BaseError> {
    // Check if plant is active
    if (!plant.isActive) {
      return Result.fail(
        new BusinessRuleError('Cannot harvest inactive plant', {
          plantId: plant.id,
          isActive: plant.isActive,
        })
      );
    }

    // Check if harvest date is not in the future
    const dateToCheck = harvestDate || new Date();
    if (dateToCheck > new Date()) {
      return Result.fail(
        new BusinessRuleError('Harvest date cannot be in the future', {
          plantId: plant.id,
          harvestDate: dateToCheck,
        })
      );
    }

    // Check if harvest date is not before planted date
    if (dateToCheck < plant.plantedDate) {
      return Result.fail(
        new BusinessRuleError('Harvest date cannot be before planted date', {
          plantId: plant.id,
          harvestDate: dateToCheck,
          plantedDate: plant.plantedDate,
        })
      );
    }

    // Warn if harvesting before expected harvest date (business logic)
    if (plant.expectedHarvestDate && dateToCheck < plant.expectedHarvestDate) {
      // This is a warning, not an error - allow it but could log
      // In production, might want to add a warning to the result
    }

    return Result.ok(undefined);
  }

  /**
   * Publish PlantHarvested domain event.
   */
  private async publishPlantHarvestedEvent(plant: Plant, harvestDate?: Date): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlantHarvested',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        plantId: plant.id,
        plantName: plant.name,
        plantType: plant.type,
        harvestDate: harvestDate || new Date(),
        expectedHarvestDate: plant.expectedHarvestDate,
        ageInDays: plant.age,
      },
      metadata: {},
      version: 1,
    });
  }
}
