# Christ Embassy Ireland — Operations Runbook

This guide covers day‑to‑day operations, deployments, incident response, and recovery procedures for Christ Embassy Ireland.

## Environments & Access
- Development: PostgreSQL (same schema as production). Quick setup with `npm run db:setup`.
- Production: PostgreSQL. Set `DATABASE_URL` and other envs in your host (e.g., Vercel).
- Access: Limit who can read/write production env vars and database credentials.

## Production Deploy — Vercel + Coolify Postgres

Use Vercel for the app and a self‑hosted PostgreSQL (via Coolify) for the database.

1) Prepare PostgreSQL on Coolify
- Create a PostgreSQL service (v14+ recommended) and a database/user.
- Enable external access over TLS (require SSL) and open the port (typically `5432`).
- Copy the connection string:
  - `postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`
- Strongly recommended: add connection pooling to avoid “too many connections” from serverless:
  - Option A – Prisma Accelerate: Managed global pool. You’ll set `DATABASE_URL` to the `prisma://...` URL and `DIRECT_URL` to the postgres URL above.
  - Option B – pgBouncer on your server: Expose pooled port (often `6432`) and append `?pgbouncer=true` to the connection string.

2) Prisma schema
- File: `ceireland/prisma/schema.prisma` (PostgreSQL provider with optional `DIRECT_URL`)
- Migrations: `ceireland/prisma/migrations` (if using `prisma migrate`)

3) Configure Vercel Project → Settings → Environment Variables
- If your Root Directory is NOT set to `ceireland`, set `PRISMA_SCHEMA` = `ceireland/prisma/schema.prisma` to ensure @prisma/client builds against the right schema.
- `DATABASE_URL` = your Postgres (or Prisma Accelerate) connection string
  - If using Accelerate: `DIRECT_URL` = direct Postgres connection string
- `JWT_SECRET` = strong random secret
- `NEXT_PUBLIC_APP_URL` = e.g. `https://your-app.vercel.app`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Optional: `RHAPSODY_BASE_URL`, `RHAPSODY_LANG`

4) First-time database setup (one-time)
- From your laptop (or CI), point env to production DB and create the schema:
  - Fresh DB: `npx prisma db push --schema ceireland/prisma/schema.prisma`
  - Prefer migrations later; for a greenfield deploy, push is fine.
- Seed sample data (optional): `npm --prefix ceireland run db:seed` (ensure env vars point to prod DB first)

5) Deploy to Vercel
- Import the repo, framework preset: Next.js (defaults are fine).
- Ensure env variables are present for Production.
- Deploy. Verify server logs and basic flows (login, admin dashboard, stream, banners).

6) Ongoing schema changes (after initial deploy)
- Recommended: migrate with Postgres migrations. Two easy paths:
  - Generate and deploy migrations via a staging Postgres: develop with Postgres locally or a staging DB, `prisma migrate dev`, commit migrations, and run `prisma migrate deploy` against production.
  - If changes are small and downtime is acceptable: `prisma db push --schema ceireland/prisma/schema.prisma` (no history; use carefully in prod).

7) Connection Pooling Notes
- Prisma Accelerate (recommended for Vercel):
  - Set `DATABASE_URL` to your Accelerate URL (`prisma://...` or `prisma+postgres://...`) and `DIRECT_URL` to the Postgres URL.
  - No app code change required; our Prisma Client works as-is.
- pgBouncer (transaction mode):
  - Use the pooled port/string and append `?pgbouncer=true`.
  - Keep TLS enabled (`sslmode=require`).

8) Common Production Pitfalls
- Too many connections: add pooling (Accelerate or pgBouncer).
- 401/403 auth: ensure `JWT_SECRET` is set identically across environments.
- SMTP errors: verify credentials and sender domain alignment (SPF/DKIM/DMARC).
- HLS playback blocked: check CORS/headers on the stream origin; test `.m3u8` manually.

## Secrets Management
- JWT Secret (`JWT_SECRET`):
  - Purpose: Signs auth tokens stored in the `auth-token` cookie.
  - Rotation: Rotating forces all users to sign in again.
    1) Announce a brief maintenance window.
    2) Set a new strong `JWT_SECRET` in the host.
    3) Redeploy/restart the app.
    4) Optionally, clear cookies by asking users to log out/in.
- SMTP Credentials:
  - Use a provider with domain verification (SPF, DKIM, DMARC).
  - Rotate app passwords/keys periodically.
- Database Credentials:
  - Store in host’s secret manager. Restrict network access to your app.

## Database Operations
- Migrations (recommended for prod):
  - Develop schema changes locally: `npx prisma migrate dev --name <change>`.
  - Commit generated migration files.
  - Deploy to production: `npx prisma migrate deploy` (in CI or a one‑off shell).
- Early prototypes (push only):
  - `npx prisma db push` applies the current schema without migration history. Use cautiously for production.
- Backups:
  - PostgreSQL (example):
    - Create dump: `pg_dump --no-owner -Fc "$DATABASE_URL" -f backup_$(date +%F).dump`
    - Plain SQL: `pg_dump --no-owner "$DATABASE_URL" > backup_$(date +%F).sql`
  - SQLite (legacy dev): if you used the earlier SQLite dev setup, replace the `prisma/dev.db` file with a backup copy. Current default is PostgreSQL for all environments.
- Restore:
  - PostgreSQL (into a fresh database):
    - Create target DB: `createdb ceireland_restore`
    - Restore dump: `pg_restore -d ceireland_restore backup_YYYY-MM-DD.dump`
    - Point `DATABASE_URL` at the restored DB; redeploy. Validate before switching traffic.
  - SQLite (dev): Replace the `prisma/dev.db` file with a backup copy.

## Email Operations
- Domain setup: Configure SPF, DKIM, DMARC for your sender domain.
- Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Testing: Trigger a login and check your provider’s logs/metrics if mail isn’t delivered.

## Streaming Operations (HLS)
- Settings: Admin → Stream tab controls `streamUrl`, `posterUrl`, schedules, and events.
- Requirements:
  - HLS `.m3u8` must be accessible over HTTPS.
  - If hosted on a different domain, ensure CORS/headers permit playback.
- Stream Scheduling:
  - **Weekly Schedules**: Set recurring time slots (e.g., Sunday 10:00-12:00, Wednesday 19:00-21:00).
  - **One-off Events**: Schedule special services with specific start/end datetimes (e.g., Christmas Service).
  - **Priority Order**: Manual override → One-off events → Weekly schedules.
  - **Manual Override**: "Force Live" button activates stream immediately, ignoring all schedules.
  - Streams auto-activate when scheduled time arrives and auto-deactivate when end time passes.
- Stream Offline Handling:
  - When a service is marked active but the HLS feed is unavailable, viewers see a friendly "Stream Starting Soon" message instead of an error.
  - The player automatically retries every 30 seconds to check if the stream has come online.
  - Once the stream becomes available, playback starts automatically without user intervention.
  - The LIVE badge only appears when the stream is actually playing, not when offline.
  - This allows admins to schedule streams before the actual feed begins.
- Debugging playback:
  - Check DevTools Network for `.m3u8` and `.ts` segment responses.
  - `HLSPlayer` logs lifecycle events to the console (in development mode).
  - Test the URL in a known HLS player (e.g., Safari or an online HLS tester) to confirm the stream.

## Devotional (Rhapsody) Endpoint
- Public endpoint: `/api/rhapsody`.
- Query options: `?date=YYYY-MM-DD&lang=english`.
- Force refresh: `?refresh=1` (bypasses cache in production).
- Overrides (env):
  - `RHAPSODY_BASE_URL` (default: `https://read.rhapsodyofrealities.org`)
  - `RHAPSODY_LANG` (default: `english`)

## Incident Response
- Auth failures (401/403):
  - Ensure `JWT_SECRET` is set and consistent across instances.
  - Confirm cookies are set with `Secure` in prod and domain matches `NEXT_PUBLIC_APP_URL`.
  - Check `/api/auth/me` responses and server logs for token verification errors.
- Email not delivered:
  - Verify SMTP credentials and sender domain setup.
  - Check provider logs for bounces/rate limits.
- DB errors (500s):
  - Verify `DATABASE_URL` connectivity/permissions.
  - Check for pending migrations; run `prisma migrate deploy`.
- HLS playback errors:
  - Verify `.m3u8` reachable and CORS headers.
  - Toggle `isActive` off/on to ensure UI state is clear; confirm poster displays.
- Devotional errors:
  - Check external source availability.
  - Use `?refresh=1` and/or switch `RHAPSODY_BASE_URL` temporarily.
  - If content fails to load, the upstream API may have changed. See `docs/RhapsodyDaily.md` for API change history and discovery steps.
  - Test the upstream API directly: `curl "https://read.rhapsodyofrealities.org/api/ror-translations/$(date +%Y-%m-%d)/english"`

## Maintenance Tasks
- Approve users: Admin → Users tab.
- Update schedule/header: Admin → Service Info tab.
- Manage banners: Admin → Banners tab.

### Admin & User Management
- Add an admin: Admin Dashboard → Users → "Add Admin" button.
  - Fill the basic profile and save. The account is created with role `ADMIN` and approved immediately.
- Promote/demote an existing user: In the Users table, use "Make Admin" or "Remove Admin" under Actions.
  - Safety: The system prevents demoting/deleting the last remaining admin.
- Edit a user: Click "Edit" in the Actions column, update profile fields, and save.
- Delete a user: Click "Delete". Attendance records are removed via DB cascade.
- Admins joining service: From the Admin Dashboard header, use "Go to Service" to open the standard user view (stream, banners, devotionals). This keeps admin and member flows convenient.

## Monitoring & Logs
- App logs: Use your host’s log viewer (e.g., Vercel) to watch for spikes in 401/403/5xx.
- Availability: Configure uptime checks for the main site and `/api/stream`.
- Error tracking: Consider enabling a tool like Sentry (optional).

## Disaster Recovery Overview
- Validate backups regularly by restoring to a staging database and running smoke tests.
- If secrets leak (JWT/SMTP/DB): rotate credentials and redeploy. Expect users to re‑authenticate after JWT rotation.
- Document and rehearse a simple recovery drill: restore DB → redeploy with new `DATABASE_URL` → verify admin login → verify stream and dashboards.
