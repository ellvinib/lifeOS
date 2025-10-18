/**
 * Calendar Event Validation Schemas
 *
 * Zod schemas for validating calendar event API requests.
 *
 * @module Calendar Presentation
 */

import { z } from 'zod';

/**
 * Calendar Provider Enum
 */
export const CalendarProviderSchema = z.enum(['google', 'outlook', 'icloud']);

/**
 * Event Category Enum
 */
export const EventCategorySchema = z.enum([
  'work',
  'personal',
  'garden_task',
  'finance_meeting',
  'focus_time',
  'break',
  'meeting',
  'appointment',
]);

/**
 * Priority Enum
 */
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Base Calendar Event Schema
 */
const BaseCalendarEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  location: z
    .string()
    .max(300, 'Location must be less than 300 characters')
    .trim()
    .optional(),
  startTime: z
    .string()
    .datetime('Invalid start time format. Use ISO 8601 format'),
  endTime: z
    .string()
    .datetime('Invalid end time format. Use ISO 8601 format'),
  isAllDay: z.boolean().optional().default(false),
  timeZone: z
    .string()
    .max(50, 'Time zone must be less than 50 characters')
    .optional(),
  isFlexible: z.boolean().optional().default(false),
  flexibilityScore: z
    .number()
    .int('Flexibility score must be an integer')
    .min(0, 'Flexibility score must be between 0 and 100')
    .max(100, 'Flexibility score must be between 0 and 100')
    .optional(),
  priority: PrioritySchema,
  category: EventCategorySchema,
  attendees: z
    .array(z.string().email('Invalid attendee email address'))
    .max(50, 'Maximum 50 attendees allowed')
    .optional(),
  organizerEmail: z
    .string()
    .email('Invalid organizer email address')
    .optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z
    .string()
    .max(500, 'Recurrence rule must be less than 500 characters')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code (e.g., #FF5733)')
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
});

/**
 * Create Calendar Event Request Schema
 *
 * Validates:
 * - End time is after start time
 * - Flexible events have flexibility score
 */
export const CreateCalendarEventSchema = BaseCalendarEventSchema.refine(
  (data) => {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    return endTime > startTime;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => !data.isFlexible || data.flexibilityScore !== undefined,
  {
    message: 'Flexibility score is required for flexible events',
    path: ['flexibilityScore'],
  }
);

/**
 * Update Calendar Event Request Schema
 *
 * Partial schema - all fields optional except constraints
 */
export const UpdateCalendarEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  location: z
    .string()
    .max(300, 'Location must be less than 300 characters')
    .trim()
    .optional(),
  startTime: z
    .string()
    .datetime('Invalid start time format. Use ISO 8601 format')
    .optional(),
  endTime: z
    .string()
    .datetime('Invalid end time format. Use ISO 8601 format')
    .optional(),
  isAllDay: z.boolean().optional(),
  priority: PrioritySchema.optional(),
  category: EventCategorySchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code')
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
}).refine(
  (data) => {
    // If both times provided, end must be after start
    if (data.startTime && data.endTime) {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      return endTime > startTime;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

/**
 * Calendar Event Query Parameters Schema
 */
export const CalendarEventQuerySchema = z.object({
  startDate: z
    .string()
    .datetime('Invalid start date format. Use ISO 8601 format')
    .optional(),
  endDate: z
    .string()
    .datetime('Invalid end date format. Use ISO 8601 format')
    .optional(),
  category: EventCategorySchema.optional(),
  priority: PrioritySchema.optional(),
  isFlexible: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  createdByModule: z
    .string()
    .max(50, 'Module name must be less than 50 characters')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).refine(
  (data) => {
    // If both dates provided, end must be after start
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate > startDate;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

/**
 * Calendar Event ID Parameter Schema
 */
export const CalendarEventIdSchema = z.object({
  id: z.string().uuid('Invalid event ID format'),
});
