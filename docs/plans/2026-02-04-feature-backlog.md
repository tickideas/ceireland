# Feature Backlog — Ideas (Member, Engagement, Infrastructure)

**Date:** 2026-02-04  
**Status:** Idea backlog

## Member Experience (A)
- **Next Service Countdown** (implemented separately)
- **Fallback VOD** when stream is offline (last recorded service)
- **Pinned Announcements** (admin can pin 1–2 banners to the top)
- **Continue Watching** (resume point for recorded content)

## Engagement (C)
- **Service reminders** via email (30 mins before scheduled service)
- **Prayer request follow‑up** (admin can mark + send email response)
- **Attendance intent** (“I’m attending” button pre‑service)
- **Guest capture during Open Events** (optional name/email for guests)

## Infrastructure (D)
- **Email queue/worker** (background sending, retries, provider resilience)
- **Stream uptime checks** (admin warning if HLS URL is down)
- **Error tracking** (Sentry for client + server)
- **API caching** for frequently hit endpoints (banners, settings, stream)
