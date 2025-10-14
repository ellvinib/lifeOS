/**
 * Garden Area Routes
 *
 * Route definitions for garden area endpoints.
 *
 * Design principles:
 * - Factory pattern: Create routes with dependencies
 * - Declarative: Route definitions are clear
 * - Middleware composition: Validation → Controller
 * - No business logic in routes
 */

import { Router } from 'express';
import type { IGardenAreaRepository, EventBus } from '@lifeos/core';

import { GardenAreaController } from '../controllers/GardenAreaController';
import { validateRequest } from '../middleware/validateRequest';
import {
  CreateGardenAreaSchema,
  UpdateGardenAreaSchema,
  GetGardenAreaByIdSchema,
  GetGardenAreasQuerySchema,
  DeleteGardenAreaSchema,
  RecordMaintenanceSchema,
} from '../../application/validation/GardenAreaValidation';

/**
 * Create garden area routes with dependency injection.
 */
export function createGardenAreaRoutes(
  gardenAreaRepository: IGardenAreaRepository,
  eventBus: EventBus
): Router {
  const router = Router();
  const controller = new GardenAreaController(gardenAreaRepository, eventBus);

  // GET /api/garden/areas
  router.get(
    '/',
    validateRequest(GetGardenAreasQuerySchema),
    controller.getAreas.bind(controller)
  );

  // GET /api/garden/areas/:id
  router.get(
    '/:id',
    validateRequest(GetGardenAreaByIdSchema),
    controller.getArea.bind(controller)
  );

  // POST /api/garden/areas
  router.post(
    '/',
    validateRequest(CreateGardenAreaSchema),
    controller.createArea.bind(controller)
  );

  // PUT /api/garden/areas/:id
  router.put(
    '/:id',
    validateRequest(UpdateGardenAreaSchema),
    controller.updateArea.bind(controller)
  );

  // DELETE /api/garden/areas/:id
  router.delete(
    '/:id',
    validateRequest(DeleteGardenAreaSchema),
    controller.deleteArea.bind(controller)
  );

  // POST /api/garden/areas/:id/maintenance
  router.post(
    '/:id/maintenance',
    validateRequest(RecordMaintenanceSchema),
    controller.recordMaintenance.bind(controller)
  );

  return router;
}
