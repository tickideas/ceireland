# Christ Embassy Ireland — Product Overview

## Summary
Church App is a modern online church platform that lets congregants register and attend services online while giving administrators robust tools to manage users, stream services via HLS, publish announcements, and view attendance analytics. It is built with Next.js, Prisma, and a simple passwordless sign-in flow.

## Target Users
- Members: Register, sign in via email, watch live streams, view service schedule, read daily devotional, and see announcements.
- Administrators: Approve users, manage banners and service information, configure the live stream, import users, and analyze attendance.

## Core Use Cases
- Seamless, passwordless entry into services using email-only sign-in.
- Live HLS streaming for Sunday and midweek services with a poster image fallback.
- Dynamic announcements via a banner carousel.
- Attendance capture and reporting with weekly trends and CSV exports.
- Configurable dashboard labels, schedule times, and auth page background.

## Key Features
- Authentication: Magic-link style login (email initiated), JWT-backed sessions.
- Open Events: Temporary public access during special events without authentication required.
- Streaming: HLS playback with native support or hls.js fallback. Intelligent offline detection with auto-reconnect when stream becomes available.
- Admin Console: User approvals, stream settings, service info, banner management, user import, analytics, reports, and open events management.
- Devotional: Daily Rhapsody content fetched and displayed to members.
- Attendance Tracking: Automatic tracking for both authenticated members and anonymous guests during open events.

## Data Model (Prisma)
- User: Basic profile fields, role, approved flag.
- Service: Dated services with optional `hlsUrl` and `isActive`.
- Attendance: User check-in to a given service (unique per user/service).
- OpenEvent: Special events with date ranges that allow public access without authentication.
- OpenEventAttendance: Tracks both guest (sessionId) and member (userId) attendance with timestamps.
- Banner: Title, image URL, optional link URL, order, active.
- StreamSettings: `streamUrl`, `posterUrl`, and `isActive` flag used by player and admin.
- ServiceSettings: App title, header and schedule labels, and auth background image URL.

## High-Level Architecture
- Next.js App Router UI in `src/app` with serverless API routes under `src/app/api`.
- Prisma ORM for data access; PostgreSQL database with connection pooling via Prisma Accelerate.
- Stateless auth via signed cookies and JWTs.
- HLS client built on `hls.js` with robust event logging and playback fallbacks.

## Primary Screens
- Public: Login, Register (with honeypot spam check), redirector at `/`.
- Guest Access (during Open Events): Direct access to member dashboard without authentication.
- Member Dashboard: Live player, Rhapsody daily read, service schedule, and announcements.
- Admin Dashboard: Tabs for Dashboard (analytics), Users, Banners, Stream, Service Info, Import Users, Reports, and Open Events.

## API Overview (selected)
- `/api/auth/*`: Registration, login, logout, and `me` for session checks.
- `/api/admin/users*`: List users and approve registrations.
- `/api/admin/banners*`: CRUD for announcement banners.
- `/api/admin/stream`: Get/put the HLS stream settings.
- `/api/admin/service-settings`: Get/put dashboard labels and auth page background.
- `/api/admin/analytics*`: Summary metrics, timeseries, and CSV export.
- `/api/attendance/checkin`: Record a user’s attendance for the current/nearest service.
- `/api/stream`: Public read-only view of stream settings for the player.
- `/api/service-settings`: Public read-only view of dashboard labels.
- `/api/rhapsody`: Fetches daily devotional content (supports optional date/lang).

## Configuration & Environment
Required environment variables are documented in `README.md`. Optional variables:
- `RHAPSODY_BASE_URL`: Override devotional content source base URL.
- `RHAPSODY_LANG`: Default devotional language (e.g., `english`).

## Security & Privacy
- Admin-only endpoints enforce role checks using JWTs.
- Registrations require admin approval before access is granted.
- Honeypot field mitigates bot signups.
- Do not log secrets or user tokens; avoid storing PII beyond what’s needed.

## Success Metrics
- Weekly active members (signed in / attended).
- Service attendance counts and trends.
- Registration approval throughput and time to approval.
- Stream uptime and playback error rate.

## Roadmap (suggested)
- Push notifications or email reminders for upcoming services.
- Scheduled services management and past-service VOD catalog.
- Role granularization (moderators, stream operators).
- Multi-campus support and per-campus schedules.
- Basic CMS for static pages (about, giving, contact).

## Glossary
- HLS: HTTP Live Streaming, `.m3u8` playlist-based streaming.
- Banner: Visual announcement card with optional link.
- Service Settings: Labels and schedule text shown on the member dashboard.
- Open Event: Temporary period when public/guest access is enabled without authentication, with automatic attendance tracking.

