/**
 * Record Maintenance Use Case
 *
 * Business logic for recording a garden area maintenance event.
 *
 * Design principles:
 * - Single Responsibility: Only handles maintenance record
 * - Business logic HERE: Validation, domain logic, coordination
 * - No HTTP concerns: That's in controllers
 * - No database queries: That's in repositories
 * - Returns Result type: Explicit error handling
 */

import type { IGardenAreaRepository, GardenArea, EventBus, Result, BaseError } from '@lifeos/core';
import { BusinessRuleError } from '@lifeos/core';

/**
 * Record Maintenance Use Case.
 *
 * Records maintenance event for a garden area and publishes domain event.
 */
export class RecordMaintenanceUseCase {
  constructor(
    private readonly gardenAreaRepository: IGardenAreaRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Execute the use case.
   *
   * @param areaId - ID of garden area to maintain
   * @param maintainedDate - Date of maintenance (defaults to now)
   * @returns Result with updated area or error
   */
  async execute(areaId: string, maintainedDate?: Date): Promise<Result<GardenArea, BaseError>> {
    // 1. Get garden area
    const areaResult = await this.gardenAreaRepository.findById(areaId);
    if (areaResult.isFail()) {
      return areaResult;
    }

    const area = areaResult.value;

    // 2. Validate business rules
    const validationResult = this.validateBusinessRules(area, maintainedDate);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // 3. Record maintenance (domain logic)
    area.recordMaintenance(maintainedDate);

    // 4. Persist updated area
    const updateResult = await this.gardenAreaRepository.update(area);
    if (updateResult.isFail()) {
      return updateResult;
    }

    const updatedArea = updateResult.value;

    // 5. Publish domain event
    await this.publishAreaMaintainedEvent(updatedArea, maintainedDate);

    // 6. Return result
    return Result.ok(updatedArea);
  }

  /**
   * Validate business rules for maintenance.
   */
  private validateBusinessRules(area: GardenArea, maintainedDate?: Date): Result<void, BaseError> {
    // Check if area is active
    if (!area.isActive) {
      return Result.fail(
        new BusinessRuleError('Cannot maintain inactive garden area', {
          areaId: area.id,
          isActive: area.isActive,
        })
      );
    }

    // Check if maintained date is not in the future
    const dateToCheck = maintainedDate || new Date();
    if (dateToCheck > new Date()) {
      return Result.fail(
        new BusinessRuleError('Maintained date cannot be in the future', {
          areaId: area.id,
          maintainedDate: dateToCheck,
        })
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Publish AreaMaintained domain event.
   */
  private async publishAreaMaintainedEvent(area: GardenArea, maintainedDate?: Date): Promise<void> {
    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'GardenAreaMaintained',
      source: 'garden-module',
      timestamp: new Date(),
      payload: {
        areaId: area.id,
        areaName: area.name,
        areaType: area.type,
        maintainedDate: maintainedDate || new Date(),
        previousMaintainedDate: area.lastMaintained,
        maintenanceFrequencyDays: area.maintenanceFrequencyDays,
        daysUntilNextMaintenance: area.daysUntilNextMaintenance(),
      },
      metadata: {},
      version: 1,
    });
  }
}
