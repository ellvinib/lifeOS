/**
 * Calendar Event Controller
 *
 * Handles HTTP requests for calendar event operations.
 * Thin controller that delegates to use cases.
 *
 * Endpoints:
 * - POST   /events          - Create calendar event
 * - GET    /events/:id      - Get single event
 * - GET    /events          - Get events within date range
 * - PUT    /events/:id      - Update event
 * - DELETE /events/:id      - Delete event
 *
 * @module Calendar Presentation
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeos/core/events';
import {
  CreateEventUseCase,
  UpdateEventUseCase,
  DeleteEventUseCase,
  GetEventUseCase,
  GetEventsUseCase,
  CalendarEventDTOMapper,
} from '../../application';
import { CalendarEventRepository } from '../../infrastructure';

/**
 * Calendar Event Controller
 *
 * All methods are thin - just parse request, call use case, return response.
 */
export class CalendarEventController {
  private readonly createUseCase: CreateEventUseCase;
  private readonly updateUseCase: UpdateEventUseCase;
  private readonly deleteUseCase: DeleteEventUseCase;
  private readonly getUseCase: GetEventUseCase;
  private readonly getEventsUseCase: GetEventsUseCase;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus
  ) {
    // Initialize repository
    const eventRepository = new CalendarEventRepository(prisma);

    // Initialize use cases
    this.createUseCase = new CreateEventUseCase(eventRepository, eventBus);
    this.updateUseCase = new UpdateEventUseCase(eventRepository, eventBus);
    this.deleteUseCase = new DeleteEventUseCase(eventRepository, eventBus);
    this.getUseCase = new GetEventUseCase(eventRepository);
    this.getEventsUseCase = new GetEventsUseCase(eventRepository);
  }

  /**
   * Create calendar event
   * POST /events
   */
  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Get userId from authentication middleware
      const userId = req.body.userId || 'test-user-id';

      const input = CalendarEventDTOMapper.fromRequestDTO(req.body);
      const result = await this.createUseCase.execute(input, userId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(201).json({
        success: true,
        data: CalendarEventDTOMapper.toResponseDTO(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single event
   * GET /events/:id
   */
  async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Get userId from authentication middleware
      const userId = req.query.userId as string || 'test-user-id';

      const result = await this.getUseCase.execute(id, userId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: CalendarEventDTOMapper.toResponseDTO(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get events within date range
   * GET /events?startDate=2025-10-01&endDate=2025-10-31
   */
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Get userId from authentication middleware
      const userId = req.query.userId as string || 'test-user-id';

      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate query parameters are required',
        });
        return;
      }

      const input = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const result = await this.getEventsUseCase.execute(input, userId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.value.map(CalendarEventDTOMapper.toResponseDTO),
        count: result.value.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update event
   * PUT /events/:id
   */
  async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Get userId from authentication middleware
      const userId = req.body.userId || 'test-user-id';

      const input = CalendarEventDTOMapper.fromUpdateDTO(req.body);
      const result = await this.updateUseCase.execute(id, input, userId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: CalendarEventDTOMapper.toResponseDTO(result.value),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete event
   * DELETE /events/:id
   */
  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Get userId from authentication middleware
      const userId = req.query.userId as string || 'test-user-id';

      const result = await this.deleteUseCase.execute(id, userId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
