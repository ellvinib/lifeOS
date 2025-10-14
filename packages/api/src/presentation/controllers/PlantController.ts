/**
 * Plant Controller
 *
 * HTTP layer for plant operations.
 *
 * Responsibilities (THIN LAYER):
 * 1. Parse HTTP request
 * 2. Call use case / repository
 * 3. Map result to HTTP response
 * 4. That's it!
 */

import type { Request, Response, NextFunction } from 'express';
import type { IPlantRepository, EventBus } from '@lifeos/core';

import { CreatePlantUseCase } from '../../application/use-cases/CreatePlantUseCase';
import { RecordWateringUseCase } from '../../application/use-cases/RecordWateringUseCase';
import { RecordFertilizingUseCase } from '../../application/use-cases/RecordFertilizingUseCase';
import { RecordPruningUseCase } from '../../application/use-cases/RecordPruningUseCase';
import { RecordHarvestUseCase } from '../../application/use-cases/RecordHarvestUseCase';
import { PlantDTOMapper } from '../../application/dtos/PlantDTOMapper';
import type {
  PlantResponseDTO,
  PlantListResponseDTO,
  CreatePlantRequestDTO,
  PlantQueryRequestDTO,
} from '../../application/dtos/PlantDTO';

/**
 * Plant controller.
 *
 * Thin layer that coordinates HTTP ↔ Use Cases.
 */
export class PlantController {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * GET /api/garden/plants/:id
   */
  async getPlant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.plantRepository.findById(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const dto: PlantResponseDTO = PlantDTOMapper.toResponseDTO(result.value);
      res.status(200).json(dto);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/garden/plants
   */
  async getPlants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryDTO = req.query as unknown as PlantQueryRequestDTO;
      const queryOptions = PlantDTOMapper.toQueryOptions(queryDTO);

      const plantsResult = await this.plantRepository.findMany(queryOptions);
      if (plantsResult.isFail()) {
        next(plantsResult.error);
        return;
      }

      const countResult = await this.plantRepository.count(queryOptions);
      if (countResult.isFail()) {
        next(countResult.error);
        return;
      }

      const plants = PlantDTOMapper.toResponseDTOList(plantsResult.value);
      const total = countResult.value;

      const response: PlantListResponseDTO = {
        data: plants,
        pagination: {
          total,
          limit: queryOptions.limit ?? 50,
          offset: queryOptions.offset ?? 0,
          hasMore: (queryOptions.offset ?? 0) + plants.length < total,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/garden/plants
   */
  async createPlant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreatePlantRequestDTO = req.body;
      const plant = PlantDTOMapper.fromCreateDTO(dto);

      const useCase = new CreatePlantUseCase(this.plantRepository, this.eventBus);
      const result = await useCase.execute(plant);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: PlantResponseDTO = PlantDTOMapper.toResponseDTO(result.value);
      res.status(201).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/garden/plants/:id
   */
  async updatePlant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateDTO = req.body;

      const plantResult = await this.plantRepository.findById(id);
      if (plantResult.isFail()) {
        next(plantResult.error);
        return;
      }

      const plant = plantResult.value;
      PlantDTOMapper.applyUpdateDTO(plant, updateDTO);

      const updateResult = await this.plantRepository.update(plant);
      if (updateResult.isFail()) {
        next(updateResult.error);
        return;
      }

      const responseDTO: PlantResponseDTO = PlantDTOMapper.toResponseDTO(updateResult.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/garden/plants/:id
   */
  async deletePlant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.plantRepository.delete(id);

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
   * POST /api/garden/plants/:id/water
   * Record watering event.
   */
  async recordWatering(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { wateredDate } = req.body;

      const date = wateredDate ? new Date(wateredDate) : undefined;
      const useCase = new RecordWateringUseCase(this.plantRepository, this.eventBus);
      const result = await useCase.execute(id, date);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: PlantResponseDTO = PlantDTOMapper.toResponseDTO(result.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/garden/plants/:id/fertilize
   * Record fertilizing event.
   */
  async recordFertilizing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { fertilizedDate } = req.body;

      const date = fertilizedDate ? new Date(fertilizedDate) : undefined;
      const useCase = new RecordFertilizingUseCase(this.plantRepository, this.eventBus);
      const result = await useCase.execute(id, date);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: PlantResponseDTO = PlantDTOMapper.toResponseDTO(result.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/garden/plants/:id/prune
   * Record pruning event.
   */
  async recordPruning(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { prunedDate } = req.body;

      const date = prunedDate ? new Date(prunedDate) : undefined;
      const useCase = new RecordPruningUseCase(this.plantRepository, this.eventBus);
      const result = await useCase.execute(id, date);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: PlantResponseDTO = PlantDTOMapper.toResponseDTO(result.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/garden/plants/:id/harvest
   * Record harvest event.
   */
  async recordHarvest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { harvestDate } = req.body;

      const date = harvestDate ? new Date(harvestDate) : undefined;
      const useCase = new RecordHarvestUseCase(this.plantRepository, this.eventBus);
      const result = await useCase.execute(id, date);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const responseDTO: PlantResponseDTO = PlantDTOMapper.toResponseDTO(result.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }
}
