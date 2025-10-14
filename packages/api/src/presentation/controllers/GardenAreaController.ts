/**
 * GardenArea Controller
 *
 * HTTP layer for garden area operations.
 *
 * Responsibilities (THIN LAYER):
 * 1. Parse HTTP request
 * 2. Call use case / repository
 * 3. Map result to HTTP response
 * 4. That's it!
 */

import type { Request, Response, NextFunction } from 'express';
import type { IGardenAreaRepository, EventBus } from '@lifeos/core';

import { GardenAreaDTOMapper } from '../../application/dtos/GardenAreaDTOMapper';
import type {
  GardenAreaResponseDTO,
  GardenAreaListResponseDTO,
  CreateGardenAreaRequestDTO,
  GardenAreaQueryRequestDTO,
} from '../../application/dtos/GardenAreaDTO';

/**
 * GardenArea controller.
 *
 * Thin layer that coordinates HTTP ↔ Use Cases / Repositories.
 */
export class GardenAreaController {
  constructor(
    private readonly gardenAreaRepository: IGardenAreaRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * GET /api/garden/areas/:id
   */
  async getArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.gardenAreaRepository.findById(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const dto: GardenAreaResponseDTO = GardenAreaDTOMapper.toResponseDTO(result.value);
      res.status(200).json(dto);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/garden/areas
   */
  async getAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryDTO = req.query as unknown as GardenAreaQueryRequestDTO;
      const queryOptions = GardenAreaDTOMapper.toQueryOptions(queryDTO);

      const areasResult = await this.gardenAreaRepository.findMany(queryOptions);
      if (areasResult.isFail()) {
        next(areasResult.error);
        return;
      }

      const countResult = await this.gardenAreaRepository.count(queryOptions);
      if (countResult.isFail()) {
        next(countResult.error);
        return;
      }

      const areas = GardenAreaDTOMapper.toResponseDTOList(areasResult.value);
      const total = countResult.value;

      const response: GardenAreaListResponseDTO = {
        data: areas,
        pagination: {
          total,
          limit: queryOptions.limit ?? 50,
          offset: queryOptions.offset ?? 0,
          hasMore: (queryOptions.offset ?? 0) + areas.length < total,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/garden/areas
   */
  async createArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateGardenAreaRequestDTO = req.body;
      const area = GardenAreaDTOMapper.fromCreateDTO(dto);

      const result = await this.gardenAreaRepository.create(area);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Publish event
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        type: 'GardenAreaCreated',
        source: 'garden-module',
        timestamp: new Date(),
        payload: {
          areaId: result.value.id,
          name: result.value.name,
          type: result.value.type,
        },
        metadata: {},
        version: 1,
      });

      const responseDTO: GardenAreaResponseDTO = GardenAreaDTOMapper.toResponseDTO(result.value);
      res.status(201).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/garden/areas/:id
   */
  async updateArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateDTO = req.body;

      const areaResult = await this.gardenAreaRepository.findById(id);
      if (areaResult.isFail()) {
        next(areaResult.error);
        return;
      }

      const area = areaResult.value;
      GardenAreaDTOMapper.applyUpdateDTO(area, updateDTO);

      const updateResult = await this.gardenAreaRepository.update(area);
      if (updateResult.isFail()) {
        next(updateResult.error);
        return;
      }

      const responseDTO: GardenAreaResponseDTO = GardenAreaDTOMapper.toResponseDTO(updateResult.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/garden/areas/:id
   */
  async deleteArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.gardenAreaRepository.delete(id);

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
   * POST /api/garden/areas/:id/maintenance
   * Record maintenance event.
   */
  async recordMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { maintenedDate } = req.body;

      const areaResult = await this.gardenAreaRepository.findById(id);
      if (areaResult.isFail()) {
        next(areaResult.error);
        return;
      }

      const area = areaResult.value;
      const date = maintenedDate ? new Date(maintenedDate) : undefined;
      area.recordMaintenance(date);

      const updateResult = await this.gardenAreaRepository.update(area);
      if (updateResult.isFail()) {
        next(updateResult.error);
        return;
      }

      // Publish event
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        type: 'GardenAreaMaintained',
        source: 'garden-module',
        timestamp: new Date(),
        payload: {
          areaId: area.id,
          areaName: area.name,
          maintenedDate: date || new Date(),
        },
        metadata: {},
        version: 1,
      });

      const responseDTO: GardenAreaResponseDTO = GardenAreaDTOMapper.toResponseDTO(updateResult.value);
      res.status(200).json(responseDTO);
    } catch (error) {
      next(error);
    }
  }
}
