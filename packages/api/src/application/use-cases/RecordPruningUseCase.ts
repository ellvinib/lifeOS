/**
 * Record Pruning Use Case
 *
 * Business logic for recording a plant pruning event.
 *
 * Design principles:
 * - Single Responsibility: Only handles pruning record
 * - Business logic HERE: Validation, domain logic, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import type { IPlantRepository, Plant, EventBus, Result, BaseError } from '@lifeos/core';
import { BusinessRuleError } from '@lifeos/core';

/**
 * Record Pruning Use Case.
 *
 * Records pruning event for a plant and publishes domain event.
 */
export class RecordPruningUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param plantId - ID of plant to prune
   * @param prunedDate - Date of pruning (defaults to now)
   * @returns Result with updated plant or error
   */
  async execute(plantId: string, prunedDate?: Date): Promise<Result<Plant, BaseError>> {
    // 1. Get plant
    const plantResult = await this.plantRepository.findById(plantId);
    if (plantResult.isFail()) {
      return plantResult;
    }

    const plant = plantResult.value;

    // 2. Validate business rules
    const validationResult = this.validateBusinessRules(plant, prunedDate);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 3. Record pruning (domain logic)
    plant.recordPruning(prunedDate);

    // 4. Persist updated plant
    const updateResult = await this.plantRepository.update(plant);
    if (updateResult.isFail()) {
      return updateResult;
    }

    const updatedPlant = updateResult.value;

    // 5. Publish domain event
    await this.publishPlantPrunedEvent(updatedPlant, prunedDate);

    // 6. Return result
    return Result.ok(updatedPlant);
  }

  /**
   * Validate business rules for pruning.
   */
  private validateBusinessRules(plant: Plant, prunedDate?: Date): Result<void, BaseError> {
    // Check if plant is active
    if (!plant.isActive) {
      return Result.fail(
        new BusinessRuleError('Cannot prune inactive plant', {
          plantId: plant.id,
          isActive: plant.isActive,
        })
      );
    }

    // Check if pruned date is not in the future
    const dateToCheck = prunedDate || new Date();
    if (dateToCheck > new Date()) {
      return Result.fail(
        new BusinessRuleError('Pruned date cannot be in the future', {
          plantId: plant.id,
          prunedDate: dateToCheck,
        })
      );
    }

    // Check if pruned date is not before planted date
    if (dateToCheck < plant.plantedDate) {
      return Result.fail(
        new BusinessRuleError('Pruned date cannot be before planted date', {
          plantId: plant.id,
          prunedDate: dateToCheck,
          plantedDate: plant.plantedDate,
        })
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Publish PlantPruned domain event.
   */
  private async publishPlantPrunedEvent(plant: Plant, prunedDate?: Date): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlantPruned',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        plantId: plant.id,
        plantName: plant.name,
        prunedDate: prunedDate || new Date(),
        previousPrunedDate: plant.lastPruned,
      },
      metadata: {},
      version: 1,
    });
  }
}
