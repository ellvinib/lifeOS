/**
 * Garden Task Routes
 *
 * Route definitions for garden task endpoints.
 *
 * Design principles:
 * - Factory pattern: Create routes with dependencies
 * - Declarative: Route definitions are clear
 * - Middleware composition: Validation → Controller
 * - No business logic in routes
 */

import { Router } from 'express';
import type { IGardenTaskRepository, EventBus } from '@lifeos/core';

import { GardenTaskController } from '../controllers/GardenTaskController';
import { validateRequest } from '../middleware/validateRequest';
import {
  CreateGardenTaskSchema,
  UpdateGardenTaskSchema,
  GetGardenTaskByIdSchema,
  GetGardenTasksQuerySchema,
  DeleteGardenTaskSchema,
  CompleteGardenTaskSchema,
} from '../../application/validation/GardenTaskValidation';

/**
 * Create garden task routes with dependency injection.
 */
export function createGardenTaskRoutes(
  gardenTaskRepository: IGardenTaskRepository,
  eventBus: EventBus
): Router {
  const router = Router();
  const controller = new GardenTaskController(gardenTaskRepository, eventBus);

  // GET /api/garden/tasks
  router.get(
    '/',
    validateRequest(GetGardenTasksQuerySchema),
    controller.getTasks.bind(controller)
  );

  // GET /api/garden/tasks/:id
  router.get(
    '/:id',
    validateRequest(GetGardenTaskByIdSchema),
    controller.getTask.bind(controller)
  );

  // POST /api/garden/tasks
  router.post(
    '/',
    validateRequest(CreateGardenTaskSchema),
    controller.createTask.bind(controller)
  );

  // PUT /api/garden/tasks/:id
  router.put(
    '/:id',
    validateRequest(UpdateGardenTaskSchema),
    controller.updateTask.bind(controller)
  );

  // DELETE /api/garden/tasks/:id
  router.delete(
    '/:id',
    validateRequest(DeleteGardenTaskSchema),
    controller.deleteTask.bind(controller)
  );

  // POST /api/garden/tasks/:id/complete
  router.post(
    '/:id/complete',
    validateRequest(CompleteGardenTaskSchema),
    controller.completeTask.bind(controller)
  );

  return router;
}
