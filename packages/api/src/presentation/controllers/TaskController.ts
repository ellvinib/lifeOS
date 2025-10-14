import type { Request, Response, NextFunction } from 'express';
import type { ITaskRepository } from '@lifeos/core';
import type { EventBus } from '@lifeos/core';

import { GetTaskByIdUseCase } from '../../application/use-cases/GetTaskByIdUseCase';
import { CreateTaskUseCase } from '../../application/use-cases/CreateTaskUseCase';
import { TaskDTOMapper } from '../../application/dtos/TaskDTOMapper';
import type {
  TaskResponseDTO,
  TaskListResponseDTO,
  CreateTaskRequestDTO,
  TaskQueryRequestDTO,
} from '../../application/dtos/TaskDTO';

/**
 * Task controller.
 *
 * Responsibilities (THIN LAYER):
 * 1. Parse HTTP request
 * 2. Call use case
 * 3. Map result to HTTP response
 * 4. That's it!
 *
 * What this controller does NOT do:
 * ❌ Business logic (that's in use cases)
 * ❌ Database queries (that's in repositories)
 * ❌ Complex validation (that's in middleware)
 * ❌ Error formatting (that's in error middleware)
 *
 * Design principles:
 * - Thin (~50-80 lines per method)
 * - Dependency injection
 * - No business logic
 * - Returns appropriate HTTP status codes
 */
export class TaskController {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * GET /api/tasks/:id
   * Get a task by ID.
   */
  async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract parameter (already validated by middleware)
      const { id } = req.params;

      // 2. Call use case
      const useCase = new GetTaskByIdUseCase(this.taskRepository);
      const result = await useCase.execute(id);

      // 3. Handle result
      if (result.isFail()) {
        // Let error middleware handle it
        next(result.error);
        return;
      }

      // 4. Map to DTO and return
      const dto: TaskResponseDTO = TaskDTOMapper.toResponseDTO(result.value);
      res.status(200).json(dto);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tasks
   * Get tasks with optional filtering.
   */
  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract query parameters (already validated and transformed)
      const queryDTO = req.query as unknown as TaskQueryRequestDTO;

      // 2. Convert to repository query options
      const queryOptions = TaskDTOMapper.toQueryOptions(queryDTO);

      // 3. Call repository (simple query, no use case needed)
      const tasksResult = await this.taskRepository.findMany(queryOptions);
      if (tasksResult.isFail()) {
        next(tasksResult.error);
        return;
      }

      // 4. Get count for pagination
      const countResult = await this.taskRepository.count(queryOptions);
      if (countResult.isFail()) {
        next(countResult.error);
        return;
      }

      // 5. Build paginated response
      const tasks = TaskDTOMapper.toResponseDTOList(tasksResult.value);
      const total = countResult.value;

      const response: TaskListResponseDTO = {
        data: tasks,
        pagination: {
          total,
          limit: queryOptions.limit ?? 50,
          offset: queryOptions.offset ?? 0,
          hasMore: (queryOptions.offset ?? 0) + tasks.length < total,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tasks
   * Create a new task.
   */
  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract body (already validated)
      const dto: CreateTaskRequestDTO = req.body;

      // 2. Convert DTO to domain entity
      const task = TaskDTOMapper.fromCreateDTO(dto);

      // 3. Call use case
      const useCase = new CreateTaskUseCase(this.taskRepository, this.eventBus);
      const result = await useCase.execute(task);

      // 4. Handle result
      if (result.isFail()) {
        next(result.error);
        return;
      }

      // 5. Map to DTO and return with 201 Created
      const responseDTO: TaskResponseDTO = TaskDTOMapper.toResponseDTO(result.value);
      res.status(201).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tasks/:id
   * Update an existing task.
   */
  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract parameters
      const { id } = req.params;
      const updateDTO = req.body;

      // 2. Get existing task
      const taskResult = await this.taskRepository.findById(id);
      if (taskResult.isFail()) {
        next(taskResult.error);
        return;
      }

      // 3. Apply updates to task entity
      const task = taskResult.value;
      TaskDTOMapper.applyUpdateDTO(task, updateDTO);

      // 4. Save updated task
      const updateResult = await this.taskRepository.update(task);
      if (updateResult.isFail()) {
        next(updateResult.error);
        return;
      }

      // 5. Return updated task
      const responseDTO: TaskResponseDTO = TaskDTOMapper.toResponseDTO(updateResult.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tasks/:id
   * Delete a task.
   */
  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract parameter
      const { id } = req.params;

      // 2. Delete task
      const result = await this.taskRepository.delete(id);

      // 3. Handle result
      if (result.isFail()) {
        next(result.error);
        return;
      }

      // 4. Return 204 No Content
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
