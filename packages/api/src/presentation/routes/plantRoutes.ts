/**
 * Plant Routes
 *
 * Route definitions for plant endpoints.
 *
 * Design principles:
 * - Factory pattern: Create routes with dependencies
 * - Declarative: Route definitions are clear
 * - Middleware composition: Validation → Controller
 * - No business logic in routes
 */

import { Router } from 'express';
import type { IPlantRepository, EventBus } from '@lifeos/core';

import { PlantController } from '../controllers/PlantController';
import { validateRequest } from '../middleware/validateRequest';
import {
  CreatePlantSchema,
  UpdatePlantSchema,
  GetPlantByIdSchema,
  GetPlantsQuerySchema,
  DeletePlantSchema,
  RecordWateringSchema,
  RecordFertilizingSchema,
  RecordPruningSchema,
  RecordHarvestSchema,
} from '../../application/validation/PlantValidation';

/**
 * Create plant routes with dependency injection.
 */
export function createPlantRoutes(
  plantRepository: IPlantRepository,
  eventBus: EventBus
): Router {
  const router = Router();
  const controller = new PlantController(plantRepository, eventBus);

  // GET /api/garden/plants
  router.get(
    '/',
    validateRequest(GetPlantsQuerySchema),
    controller.getPlants.bind(controller)
  );

  // GET /api/garden/plants/:id
  router.get(
    '/:id',
    validateRequest(GetPlantByIdSchema),
    controller.getPlant.bind(controller)
  );

  // POST /api/garden/plants
  router.post(
    '/',
    validateRequest(CreatePlantSchema),
    controller.createPlant.bind(controller)
  );

  // PUT /api/garden/plants/:id
  router.put(
    '/:id',
    validateRequest(UpdatePlantSchema),
    controller.updatePlant.bind(controller)
  );

  // DELETE /api/garden/plants/:id
  router.delete(
    '/:id',
    validateRequest(DeletePlantSchema),
    controller.deletePlant.bind(controller)
  );

  // POST /api/garden/plants/:id/water
  router.post(
    '/:id/water',
    validateRequest(RecordWateringSchema),
    controller.recordWatering.bind(controller)
  );

  // POST /api/garden/plants/:id/fertilize
  router.post(
    '/:id/fertilize',
    validateRequest(RecordFertilizingSchema),
    controller.recordFertilizing.bind(controller)
  );

  // POST /api/garden/plants/:id/prune
  router.post(
    '/:id/prune',
    validateRequest(RecordPruningSchema),
    controller.recordPruning.bind(controller)
  );

  // POST /api/garden/plants/:id/harvest
  router.post(
    '/:id/harvest',
    validateRequest(RecordHarvestSchema),
    controller.recordHarvest.bind(controller)
  );

  return router;
}
