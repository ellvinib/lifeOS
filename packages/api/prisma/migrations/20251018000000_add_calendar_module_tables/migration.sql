-- CreateTable: Calendar Module Tables
-- Phase 1: Foundation (Manual CRUD, no external sync yet)

-- Calendar provider connections (Google, Outlook, iCloud)
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "syncErrorCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "calendarName" TEXT,
    "calendarColor" TEXT,
    "timeZone" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- Calendar events with AI scheduling support
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarConnectionId" TEXT,
    "externalEventId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "flexibilityScore" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdByModule" TEXT NOT NULL,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizerEmail" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceExceptions" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "color" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- Scheduling requests from other modules (Garden, Finance, etc.)
CREATE TABLE "scheduling_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestingModule" TEXT NOT NULL,
    "moduleEntityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "desiredStartTime" TIMESTAMP(3),
    "desiredEndTime" TIMESTAMP(3),
    "requiredDuration" INTEGER NOT NULL,
    "flexibilityScore" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "preferredTimeSlots" JSONB,
    "blackoutPeriods" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledEventId" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduling_requests_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "calendar_connections_userId_provider_externalCalendarId_key" ON "calendar_connections"("userId", "provider", "externalCalendarId");

-- Create performance indexes for calendar_connections
CREATE INDEX "calendar_connections_userId_idx" ON "calendar_connections"("userId");
CREATE INDEX "calendar_connections_provider_idx" ON "calendar_connections"("provider");
CREATE INDEX "calendar_connections_syncStatus_idx" ON "calendar_connections"("syncStatus");
CREATE INDEX "calendar_connections_isActive_idx" ON "calendar_connections"("isActive");
CREATE INDEX "calendar_connections_lastSyncedAt_idx" ON "calendar_connections"("lastSyncedAt");

-- Create performance indexes for calendar_events
CREATE INDEX "calendar_events_userId_idx" ON "calendar_events"("userId");
CREATE INDEX "calendar_events_calendarConnectionId_idx" ON "calendar_events"("calendarConnectionId");
CREATE INDEX "calendar_events_startTime_idx" ON "calendar_events"("startTime");
CREATE INDEX "calendar_events_endTime_idx" ON "calendar_events"("endTime");
CREATE INDEX "calendar_events_isFlexible_idx" ON "calendar_events"("isFlexible");
CREATE INDEX "calendar_events_priority_idx" ON "calendar_events"("priority");
CREATE INDEX "calendar_events_category_idx" ON "calendar_events"("category");
CREATE INDEX "calendar_events_createdByModule_idx" ON "calendar_events"("createdByModule");
CREATE INDEX "calendar_events_syncStatus_idx" ON "calendar_events"("syncStatus");

-- Create performance indexes for scheduling_requests
CREATE INDEX "scheduling_requests_userId_idx" ON "scheduling_requests"("userId");
CREATE INDEX "scheduling_requests_requestingModule_idx" ON "scheduling_requests"("requestingModule");
CREATE INDEX "scheduling_requests_status_idx" ON "scheduling_requests"("status");
CREATE INDEX "scheduling_requests_scheduledEventId_idx" ON "scheduling_requests"("scheduledEventId");
CREATE INDEX "scheduling_requests_priority_idx" ON "scheduling_requests"("priority");

-- Add foreign key constraints
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scheduling_requests" ADD CONSTRAINT "scheduling_requests_scheduledEventId_fkey" FOREIGN KEY ("scheduledEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
