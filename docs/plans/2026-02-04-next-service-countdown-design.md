# Next Service Countdown — Design

**Date:** 2026-02-04  
**Status:** Approved

## Goal
Show the next upcoming service inside the player area when there is **no active service**. Avoid layout shifts by keeping the countdown in the same space the player will occupy once live.

## Placement
- Render **inside the player area** when `!isActive`.
- When the stream goes live, the player replaces the countdown automatically.

## Content
- Title: “Stream Currently Offline” (existing)
- Secondary text: “There is no active service at this time.”
- New countdown block:
  - Label: `Next: {Service Label}`
  - Timer: `HH:MM:SS` or `Xd Xh Xm`

## Data Source
- `GET /api/stream` response now includes:
  - `nextScheduled` (ISO string)
  - `nextScheduledLabel` (string)

## Behavior
- Countdown updates every 1 second client‑side.
- Display only when `nextScheduled` and `nextScheduledLabel` are available.
- If time has passed, show “Starting now”.

## Future Enhancements (Optional)
- Use localized date/time display below the countdown.
- Add a CTA like “Add to Calendar”.
