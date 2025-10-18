/**
 * Calendar Event Routes
 *
 * Defines all calendar event API endpoints.
 * Routes are mounted at /api/calendar/events
 *
 * @module Calendar Presentation
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeos/core/events';
import { z } from 'zod';
import { CalendarEventController } from '../controllers/CalendarEventController';
import { validateRequest, parseTagsMiddleware } from '../middleware/validateRequest';
import {
  CreateCalendarEventSchema,
  UpdateCalendarEventSchema,
  CalendarEventIdSchema,
  CalendarEventQuerySchema,
} from '../validation';

/**
 * Wrapper schemas for validateRequest middleware
 * (validates params, query, and body together)
 */
const createEventRequestSchema = z.object({
  body: CreateCalendarEventSchema,
  query: z.object({}),
  params: z.object({}),
});

const getEventRequestSchema = z.object({
  body: z.object({}),
  query: z.object({
    userId: z.string().optional(), // TODO: Remove when auth is implemented
  }),
  params: CalendarEventIdSchema,
});

// CalendarEventQuerySchema already has .refine() applied, so we can't extend it
// Instead, recreate the query schema with userId included
const getEventsRequestSchema = z.object({
  body: z.object({}),
  query: z.object({
    userId: z.string().optional(), // TODO: Remove when auth is implemented
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    category: z.enum(['work', 'personal', 'garden_task', 'finance_meeting', 'health', 'social', 'other']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    isFlexible: z.string().transform((val) => val === 'true').optional(),
    createdByModule: z.string().max(50).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
  params: z.object({}),
});

const updateEventRequestSchema = z.object({
  body: UpdateCalendarEventSchema,
  query: z.object({}),
  params: CalendarEventIdSchema,
});

const deleteEventRequestSchema = z.object({
  body: z.object({}),
  query: z.object({
    userId: z.string().optional(), // TODO: Remove when auth is implemented
  }),
  params: CalendarEventIdSchema,
});

/**
 * Calendar Event Routes Factory
 *
 * Creates Express router with all calendar event endpoints.
 *
 * @param prisma - Prisma client instance
 * @param eventBus - Event bus for publishing domain events
 * @returns Express router
 */
export const createCalendarEventRoutes = (
  prisma: PrismaClient,
  eventBus: EventBus
): Router => {
  const router = Router();

  // Initialize controller
  const controller = new CalendarEventController(prisma, eventBus);

  /**
   * Create calendar event
   * POST /events
   */
  router.post(
    '/',
    parseTagsMiddleware,
    validateRequest(createEventRequestSchema),
    controller.createEvent.bind(controller)
  );

  /**
   * Get single event
   * GET /events/:id
   */
  router.get(
    '/:id',
    validateRequest(getEventRequestSchema),
    controller.getEvent.bind(controller)
  );

  /**
   * Get events within date range
   * GET /events?startDate=2025-10-01T00:00:00Z&endDate=2025-10-31T23:59:59Z
   */
  router.get(
    '/',
    parseTagsMiddleware,
    validateRequest(getEventsRequestSchema),
    controller.getEvents.bind(controller)
  );

  /**
   * Update event
   * PUT /events/:id
   */
  router.put(
    '/:id',
    parseTagsMiddleware,
    validateRequest(updateEventRequestSchema),
    controller.updateEvent.bind(controller)
  );

  /**
   * Delete event
   * DELETE /events/:id
   */
  router.delete(
    '/:id',
    validateRequest(deleteEventRequestSchema),
    controller.deleteEvent.bind(controller)
  );

  return router;
};
