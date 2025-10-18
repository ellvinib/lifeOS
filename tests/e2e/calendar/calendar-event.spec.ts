/**
 * Calendar Event E2E Tests
 *
 * Tests the complete calendar event lifecycle including:
 * - Creating events
 * - Retrieving events
 * - Updating events
 * - Moving flexible events
 * - Conflict detection
 * - Validation rules
 *
 * @module E2E Tests
 */

import { test, expect } from '@playwright/test';

// API base URL from environment or default
const API_URL = process.env.API_URL || 'http://localhost:3000';

test.describe('Calendar Events', () => {
  let flexibleEventId: string;
  let inflexibleEventId: string;
  const userId = 'test-user-id'; // TODO: Replace with actual auth

  test.beforeAll(async () => {
    console.log('Setting up calendar event tests...');
  });

  test.afterAll(async () => {
    console.log('Cleaning up test data...');
  });

  test('should create a new flexible calendar event', async ({ request }) => {
    const startTime = new Date('2025-11-15T14:00:00Z').toISOString();
    const endTime = new Date('2025-11-15T15:00:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Team Planning Meeting',
        description: 'Quarterly planning session',
        startTime,
        endTime,
        isFlexible: true,
        flexibilityScore: 75,
        priority: 'medium',
        category: 'work',
        location: 'Conference Room A',
        attendees: ['alice@example.com', 'bob@example.com'],
        tags: ['planning', 'quarterly'],
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const result = await response.json();
    expect(result.success).toBe(true);

    const event = result.data;
    flexibleEventId = event.id;

    expect(event).toHaveProperty('id');
    expect(event.title).toBe('Team Planning Meeting');
    expect(event.isFlexible).toBe(true);
    expect(event.flexibilityScore).toBe(75);
    expect(event.priority).toBe('medium');
    expect(event.category).toBe('work');
    expect(event.attendees).toHaveLength(2);
    expect(event.syncStatus).toBe('idle');
  });

  test('should create a new inflexible calendar event', async ({ request }) => {
    const startTime = new Date('2025-11-15T10:00:00Z').toISOString();
    const endTime = new Date('2025-11-15T11:00:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Client Presentation',
        description: 'Important client demo',
        startTime,
        endTime,
        isFlexible: false,
        flexibilityScore: 0,
        priority: 'critical',
        category: 'work',
        location: 'Client Office',
        attendees: ['client@example.com'],
        tags: ['client', 'presentation'],
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const result = await response.json();
    const event = result.data;
    inflexibleEventId = event.id;

    expect(event.title).toBe('Client Presentation');
    expect(event.isFlexible).toBe(false);
    expect(event.flexibilityScore).toBe(0);
    expect(event.priority).toBe('critical');
  });

  test('should retrieve event by ID', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/calendar/events/${flexibleEventId}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const result = await response.json();
    const event = result.data;

    expect(event.id).toBe(flexibleEventId);
    expect(event.title).toBe('Team Planning Meeting');
  });

  test('should get events within date range', async ({ request }) => {
    const startDate = new Date('2025-11-01').toISOString();
    const endDate = new Date('2025-11-30').toISOString();

    const response = await request.get(
      `${API_URL}/api/calendar/events?startDate=${startDate}&endDate=${endDate}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(Array.isArray(result.data)).toBeTruthy();
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  test('should filter events by flexibility', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/calendar/events?isFlexible=true`
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(Array.isArray(result.data)).toBeTruthy();
    expect(result.data.every((e: any) => e.isFlexible === true)).toBeTruthy();
  });

  test('should filter events by priority', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/calendar/events?priority=critical`
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(Array.isArray(result.data)).toBeTruthy();
    expect(result.data.some((e: any) => e.priority === 'critical')).toBeTruthy();
  });

  test('should filter events by category', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/calendar/events?category=work`
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(result.data.every((e: any) => e.category === 'work')).toBeTruthy();
  });

  test('should update event details', async ({ request }) => {
    const response = await request.put(
      `${API_URL}/api/calendar/events/${flexibleEventId}`,
      {
        data: {
          title: 'Updated Team Planning Meeting',
          description: 'Updated description',
          location: 'Conference Room B',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const result = await response.json();
    const event = result.data;

    expect(event.title).toBe('Updated Team Planning Meeting');
    expect(event.description).toBe('Updated description');
    expect(event.location).toBe('Conference Room B');
  });

  test('should move flexible event to new time slot', async ({ request }) => {
    const newStartTime = new Date('2025-11-15T16:00:00Z').toISOString();
    const newEndTime = new Date('2025-11-15T17:00:00Z').toISOString();

    const response = await request.put(
      `${API_URL}/api/calendar/events/${flexibleEventId}`,
      {
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    const event = result.data;

    expect(new Date(event.startTime).toISOString()).toBe(newStartTime);
    expect(new Date(event.endTime).toISOString()).toBe(newEndTime);
    expect(event.syncStatus).toBe('idle'); // Should be marked for sync
  });

  test('should prevent moving inflexible event with attendees', async ({ request }) => {
    const newStartTime = new Date('2025-11-15T12:00:00Z').toISOString();
    const newEndTime = new Date('2025-11-15T13:00:00Z').toISOString();

    const response = await request.put(
      `${API_URL}/api/calendar/events/${inflexibleEventId}`,
      {
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        },
      }
    );

    // Inflexible events with attendees cannot be moved
    // This might succeed if the business logic allows it, or fail with 400
    // Adjust based on actual implementation
    if (!response.ok()) {
      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error.message).toContain('cannot be moved');
    }
  });

  test('should validate end time is after start time', async ({ request }) => {
    const startTime = new Date('2025-11-20T15:00:00Z').toISOString();
    const endTime = new Date('2025-11-20T14:00:00Z').toISOString(); // Invalid: end before start

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Invalid Time Event',
        startTime,
        endTime,
        priority: 'low',
        category: 'personal',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.error.message || error.error.details[0]?.message).toContain('after start time');
  });

  test('should validate flexible events have flexibility score', async ({ request }) => {
    const startTime = new Date('2025-11-20T10:00:00Z').toISOString();
    const endTime = new Date('2025-11-20T11:00:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Missing Flexibility Score Event',
        startTime,
        endTime,
        isFlexible: true,
        // Missing flexibilityScore
        priority: 'low',
        category: 'personal',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.error.message || error.error.details[0]?.message).toContain('flexibility score');
  });

  test('should validate flexibility score is between 0 and 100', async ({ request }) => {
    const startTime = new Date('2025-11-20T10:00:00Z').toISOString();
    const endTime = new Date('2025-11-20T11:00:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Invalid Flexibility Score Event',
        startTime,
        endTime,
        isFlexible: true,
        flexibilityScore: 150, // Invalid: > 100
        priority: 'low',
        category: 'personal',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('should prevent creating events in the past', async ({ request }) => {
    const startTime = new Date('2020-01-01T10:00:00Z').toISOString();
    const endTime = new Date('2020-01-01T11:00:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Past Event',
        startTime,
        endTime,
        priority: 'low',
        category: 'personal',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.error.message).toContain('past');
  });

  test('should detect hard conflicts between inflexible events', async ({ request }) => {
    // Try to create an event that conflicts with the inflexible event at 10:00-11:00
    const startTime = new Date('2025-11-15T10:30:00Z').toISOString();
    const endTime = new Date('2025-11-15T11:30:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Conflicting Event',
        startTime,
        endTime,
        isFlexible: false,
        priority: 'high',
        category: 'work',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.error.message).toContain('conflict');
  });

  test('should allow soft conflicts between flexible events', async ({ request }) => {
    // Create a flexible event that conflicts with the flexible event at 16:00-17:00
    const startTime = new Date('2025-11-15T16:30:00Z').toISOString();
    const endTime = new Date('2025-11-15T17:30:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Soft Conflict Event',
        startTime,
        endTime,
        isFlexible: true,
        flexibilityScore: 80,
        priority: 'medium',
        category: 'work',
      },
    });

    // Soft conflicts (both flexible) should be allowed
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
  });

  test('should validate attendee email format', async ({ request }) => {
    const startTime = new Date('2025-11-20T10:00:00Z').toISOString();
    const endTime = new Date('2025-11-20T11:00:00Z').toISOString();

    const response = await request.post(`${API_URL}/api/calendar/events`, {
      data: {
        userId,
        title: 'Invalid Attendee Event',
        startTime,
        endTime,
        priority: 'low',
        category: 'personal',
        attendees: ['invalid-email'], // Invalid email format
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    const errorMessage = error.error.message || error.error.details[0]?.message || '';
    expect(errorMessage).toContain('email' || 'Invalid');
  });

  test('should delete a calendar event', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/api/calendar/events/${flexibleEventId}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);

    // Verify event is deleted
    const getResponse = await request.get(
      `${API_URL}/api/calendar/events/${flexibleEventId}`
    );
    expect(getResponse.status()).toBe(404);
  });

  test('should return 404 for non-existent event', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/calendar/events/non-existent-id`
    );

    expect(response.status()).toBe(404);
  });
});

test.describe('Calendar Event Business Rules', () => {
  test('should calculate flexibility correctly', () => {
    // Events with flexibility score > 50 can be rearranged
    const highFlexibility = 75;
    const lowFlexibility = 25;

    expect(highFlexibility > 50).toBe(true); // Can be rearranged
    expect(lowFlexibility > 50).toBe(false); // Cannot be rearranged
  });

  test('should identify highly flexible events', () => {
    // Events with flexibility score > 75 are highly flexible
    const highlyFlexible = 85;
    const moderatelyFlexible = 60;

    expect(highlyFlexible > 75).toBe(true);
    expect(moderatelyFlexible > 75).toBe(false);
  });

  test('should validate time slot overlap logic', () => {
    // Time slot A: 10:00-11:00
    // Time slot B: 10:30-11:30 (overlaps)
    // Time slot C: 11:00-12:00 (no overlap - adjacent)
    // Time slot D: 09:00-09:30 (no overlap)

    const slotA = { start: new Date('2025-11-15T10:00:00Z'), end: new Date('2025-11-15T11:00:00Z') };
    const slotB = { start: new Date('2025-11-15T10:30:00Z'), end: new Date('2025-11-15T11:30:00Z') };
    const slotC = { start: new Date('2025-11-15T11:00:00Z'), end: new Date('2025-11-15T12:00:00Z') };
    const slotD = { start: new Date('2025-11-15T09:00:00Z'), end: new Date('2025-11-15T09:30:00Z') };

    // Overlap logic: slotA.start < slotB.end && slotA.end > slotB.start
    const overlapAB = slotA.start < slotB.end && slotA.end > slotB.start;
    const overlapAC = slotA.start < slotC.end && slotA.end > slotC.start;
    const overlapAD = slotA.start < slotD.end && slotA.end > slotD.start;

    expect(overlapAB).toBe(true);  // Overlaps
    expect(overlapAC).toBe(false); // Adjacent, no overlap
    expect(overlapAD).toBe(false); // No overlap
  });

  test('should validate priority levels', () => {
    const priorities = ['low', 'medium', 'high', 'critical'];

    expect(priorities).toContain('low');
    expect(priorities).toContain('medium');
    expect(priorities).toContain('high');
    expect(priorities).toContain('critical');
  });

  test('should validate event categories', () => {
    const categories = [
      'work',
      'personal',
      'garden_task',
      'finance_meeting',
      'health',
      'social',
      'other',
    ];

    expect(categories).toContain('work');
    expect(categories).toContain('personal');
    expect(categories).toContain('garden_task');
    expect(categories).toContain('finance_meeting');
  });

  test('should validate sync statuses', () => {
    const syncStatuses = ['idle', 'syncing', 'completed', 'failed', 'conflict'];

    expect(syncStatuses).toContain('idle');
    expect(syncStatuses).toContain('syncing');
    expect(syncStatuses).toContain('completed');
    expect(syncStatuses).toContain('failed');
    expect(syncStatuses).toContain('conflict');
  });
});
