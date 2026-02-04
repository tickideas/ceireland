# Stream Scheduling Feature Design

**Date:** 2026-02-04  
**Status:** Approved

## Overview

Add automatic stream scheduling to reduce manual work for the media team. Supports recurring weekly slots (Sunday services, Wednesday Bible study) and one-off events (conferences, special services).

## Requirements

- Weekly recurring schedules (day + start time + end time)
- Multiple slots per day allowed
- One-off events for special occasions
- One-off events take priority over recurring schedules
- All schedules use the global stream URL
- Manage everything in the existing Stream tab
- Manual override still available (force on/off)

## Data Model

### StreamSchedule (recurring weekly slots)

```prisma
model StreamSchedule {
  id        String   @id @default(cuid())
  dayOfWeek Int      // 0-6, Sunday=0
  startTime String   // "HH:mm" format, e.g., "10:00"
  endTime   String   // "HH:mm" format, e.g., "12:00"
  label     String?  // Optional, e.g., "Sunday Service"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("stream_schedules")
}
```

### StreamEvent (one-off events)

```prisma
model StreamEvent {
  id            String   @id @default(cuid())
  title         String   // e.g., "Christmas Service"
  startDateTime DateTime
  endDateTime   DateTime
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("stream_events")
}
```

### StreamSettings changes

Existing `isActive` field becomes manual override:
- `true` = force stream ON (ignore schedules)
- `false` = respect schedules (auto mode)
- Add `manualOverride` boolean to make this explicit

## Stream Activation Logic

Priority order (checked on each `/api/stream` request):

1. **Manual override ON** → Stream is LIVE
2. **StreamEvent covers current time** → Stream is LIVE (event takes priority)
3. **StreamSchedule matches current day/time** → Stream is LIVE
4. **None of the above** → Stream is OFFLINE

### Schedule Matching

**StreamSchedule:**
- Get current day of week (0-6)
- Get current time as "HH:mm"
- Check if any active schedule: `dayOfWeek === today AND startTime <= now <= endTime`

**StreamEvent:**
- Check if any active event: `startDateTime <= now <= endDateTime`

## API Changes

### GET /api/stream (public)

Returns:
```json
{
  "streamUrl": "https://...",
  "posterUrl": "https://...",
  "isActive": true,
  "activeSource": "schedule|event|manual|none",
  "activeLabel": "Sunday Service",
  "nextScheduled": "2026-02-09T10:00:00Z"
}
```

### GET /api/admin/stream

Returns all settings plus schedules and events.

### POST /api/admin/stream/schedules

Create a recurring schedule.

### PUT /api/admin/stream/schedules/:id

Update a recurring schedule.

### DELETE /api/admin/stream/schedules/:id

Delete a recurring schedule.

### POST /api/admin/stream/events

Create a one-off event.

### PUT /api/admin/stream/events/:id

Update a one-off event.

### DELETE /api/admin/stream/events/:id

Delete a one-off event.

## UI Changes (Stream Tab)

### Section 1: Stream Status (top)

- Current status indicator: "Live (Sunday Service)" / "Offline"
- Manual override toggle with warning when active
- Next scheduled time when offline

### Section 2: Stream Configuration (existing)

- Stream URL input
- Poster Image URL input

### Section 3: Weekly Schedule (new)

- Table/list of recurring slots
- Columns: Day, Time, Label, Active, Actions
- "Add Schedule" button → modal/form
- Edit/Delete actions per row

### Section 4: One-off Events (new)

- Table/list of upcoming events
- Columns: Title, Date/Time, Status, Actions
- "Add Event" button → modal/form
- Past events collapsed or hidden
- Edit/Delete actions per row

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Overlapping schedules | First active match wins (stream is just "on") |
| Manual ON + schedule ends | Stays on (manual takes priority) |
| Event + schedule same time | Event wins (one-off priority) |
| No schedules configured | Manual control only (current behavior) |

## Implementation Plan

1. Add Prisma models and run migration
2. Update `/api/stream` with activation logic
3. Create admin API routes for schedules and events
4. Update StreamManagement component with new sections
5. Add "next scheduled" calculation
6. Update documentation

## No Background Jobs

All logic runs on-demand when `/api/stream` is called. No cron jobs or background tasks needed. Serverless-friendly.
