/**
 * GardenTask Controller
 *
 * HTTP layer for garden task operations.
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
 */

import type { Request, Response, NextFunction } from 'express';
import type { IGardenTaskRepository, EventBus } from '@lifeos/core';

import { CreateGardenTaskUseCase } from '../../application/use-cases/CreateGardenTaskUseCase';
import { GardenTaskDTOMapper } from '../../application/dtos/GardenTaskDTOMapper';
import type {
  GardenTaskResponseDTO,
  GardenTaskListResponseDTO,
  CreateGardenTaskRequestDTO,
  GardenTaskQueryRequestDTO,
} from '../../application/dtos/GardenTaskDTO';

/**
 * GardenTask controller.
 *
 * Thin layer that coordinates HTTP ↔ Use Cases.
 */
export class GardenTaskController {
  constructor(
    private readonly gardenTaskRepository: IGardenTaskRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * GET /api/garden/tasks/:id
   * Get a garden task by ID.
   */
  async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.gardenTaskRepository.findById(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const dto: GardenTaskResponseDTO = GardenTaskDTOMapper.toResponseDTO(result.value);
      res.status(200).json(dto);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/garden/tasks
   * Get garden tasks with optional filtering.
   */
  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryDTO = req.query as unknown as GardenTaskQueryRequestDTO;
      const queryOptions = GardenTaskDTOMapper.toQueryOptions(queryDTO);

      const tasksResult = await this.gardenTaskRepository.findMany(queryOptions);
      if (tasksResult.isFail()) {
        next(tasksResult.error);
        return;
      }

      const countResult = await this.gardenTaskRepository.count(queryOptions);
      if (countResult.isFail()) {
        next(countResult.error);
        return;
      }

      const tasks = GardenTaskDTOMapper.toResponseDTOList(tasksResult.value);
      const total = countResult.value;

      const response: GardenTaskListResponseDTO = {
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
   * POST /api/garden/tasks
   * Create a new garden task.
   */
  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateGardenTaskRequestDTO = req.body;
      const task = GardenTaskDTOMapper.fromCreateDTO(dto);

      const useCase = new CreateGardenTaskUseCase(this.gardenTaskRepository, this.eventBus);
      const result = await useCase.execute(task);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: GardenTaskResponseDTO = GardenTaskDTOMapper.toResponseDTO(result.value);
      res.status(201).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/garden/tasks/:id
   * Update an existing garden task.
   */
  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateDTO = req.body;

      const taskResult = await this.gardenTaskRepository.findById(id);
      if (taskResult.isFail()) {
        next(taskResult.error);
        return;
      }

      const task = taskResult.value;
      GardenTaskDTOMapper.applyUpdateDTO(task, updateDTO);

      const updateResult = await this.gardenTaskRepository.update(task);
      if (updateResult.isFail()) {
        next(updateResult.error);
        return;
      }

      const responseDTO: GardenTaskResponseDTO = GardenTaskDTOMapper.toResponseDTO(updateResult.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/garden/tasks/:id
   * Delete a garden task.
   */
  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.gardenTaskRepository.delete(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/garden/tasks/:id/complete
   * Mark a garden task as complete.
   */
  async completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { completedDate } = req.body;

      const date = completedDate ? new Date(completedDate) : undefined;
      const result = await this.gardenTaskRepository.completeTask(id, date);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: GardenTaskResponseDTO = GardenTaskDTOMapper.toResponseDTO(result.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }
}
