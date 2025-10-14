import { Router } from 'express';
import type { ITaskRepository } from '@lifeos/core';
import type { EventBus } from '@lifeos/core';

import { TaskController } from '../controllers/TaskController';
import { validateRequest } from '../middleware/validateRequest';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  GetTaskByIdSchema,
  GetTasksQuerySchema,
  DeleteTaskSchema,
} from '../../application/validation/TaskValidation';

/**
 * Create task routes with dependency injection.
 *
 * Design principles:
 * - Factory pattern: Create routes with dependencies
 * - Declarative: Route definitions are clear and concise
 * - Middleware composition: Validation → Controller
 * - No business logic in routes
 *
 * @param taskRepository - Task repository instance
 * @param eventBus - Event bus instance
 * @returns Express router
 */
export function createTaskRoutes(
  taskRepository: ITaskRepository,
  eventBus: EventBus
): Router {
  const router = Router();
  const controller = new TaskController(taskRepository, eventBus);

  /**
   * GET /api/tasks
   * Get all tasks with optional filtering.
   *
   * Query params: moduleSource, status, priority, tags, etc.
   */
  router.get(
    '/',
    validateRequest(GetTasksQuerySchema),
    controller.getTasks.bind(controller)
  );

  /**
   * GET /api/tasks/:id
   * Get a single task by ID.
   */
  router.get(
    '/:id',
    validateRequest(GetTaskByIdSchema),
    controller.getTask.bind(controller)
  );

  /**
   * POST /api/tasks
   * Create a new task.
   */
  router.post(
    '/',
    validateRequest(CreateTaskSchema),
    controller.createTask.bind(controller)
  );

  /**
   * PUT /api/tasks/:id
   * Update an existing task.
   */
  router.put(
    '/:id',
    validateRequest(UpdateTaskSchema),
    controller.updateTask.bind(controller)
  );

  /**
   * DELETE /api/tasks/:id
   * Delete a task.
   */
  router.delete(
    '/:id',
    validateRequest(DeleteTaskSchema),
    controller.deleteTask.bind(controller)
  );

  return router;
}
