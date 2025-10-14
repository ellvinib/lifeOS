/**
 * Garden Routes
 *
 * Master route file that combines all garden-related routes.
 *
 * Design principles:
 * - Modular: Separate routes by resource type
 * - Composable: Combine routes into single router
 * - Dependency injection: Pass repositories to sub-routers
 */

import { Router } from 'express';
import type { IGardenTaskRepository, IPlantRepository, IGardenAreaRepository, EventBus } from '@lifeos/core';

import { createGardenTaskRoutes } from './gardenTaskRoutes';
import { createPlantRoutes } from './plantRoutes';
import { createGardenAreaRoutes } from './gardenAreaRoutes';

/**
 * Create all garden routes with dependency injection.
 *
 * Structure:
 * - /api/garden/tasks → Garden tasks
 * - /api/garden/plants → Plants
 * - /api/garden/areas → Garden areas
 */
export function createGardenRoutes(
  gardenTaskRepository: IGardenTaskRepository,
  plantRepository: IPlantRepository,
  gardenAreaRepository: IGardenAreaRepository,
  eventBus: EventBus
): Router {
  const router = Router();

  // Register sub-routes
  router.use('/tasks', createGardenTaskRoutes(gardenTaskRepository, eventBus));
  router.use('/plants', createPlantRoutes(plantRepository, eventBus));
  router.use('/areas', createGardenAreaRoutes(gardenAreaRepository, eventBus));

  return router;
}
