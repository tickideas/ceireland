# ZChurch Deployment Guide

Purpose: Practical, copy/paste runbook for creating or updating a deployment (Vercel + PostgreSQL). For deeper ops detail see [docs/OPERATIONS.md](docs/OPERATIONS.md) and high‑level app intro in [README.md](README.md).

---

## 1. Environments

- Production: Vercel (app) + managed/self‑hosted PostgreSQL (Neon, Supabase, Vercel Postgres, Coolify, RDS, etc.).
- Staging (optional but recommended): Same stack, separate DB + env vars.
- Local Dev: Uses the same PostgreSQL schema defined in [prisma/schema.prisma](prisma/schema.prisma).

---

## 2. Required Environment Variables

Set in Vercel Project → Settings → Environment Variables (Production + Preview if needed):

| Variable | Purpose |
| -------- | ------- |
| DATABASE_URL | Primary Postgres or Prisma Accelerate URL |
| DIRECT_URL | (If using Accelerate) direct Postgres URL for migrations |
| JWT_SECRET | Signing key for auth tokens |
| NEXT_PUBLIC_APP_URL | Public base URL (e.g. https://your-app.vercel.app) |
| SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM | Magic link email |
| RHAPSODY_BASE_URL (optional) | Override devotional source |
| RHAPSODY_LANG (optional) | Default devotional language |

If the repo root in Vercel is a monorepo subfolder, also add:  
PRISMA_SCHEMA = zchurch/prisma/schema.prisma

---

## 3. First-Time Production Deployment

1. Provision a PostgreSQL database (copy its connection string with sslmode / TLS).
2. Locally (NOT in Vercel build), export the production connection string:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
# If using Accelerate:
# export DATABASE_URL="prisma+postgres://...."
# export DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

3. Generate client & push schema (greenfield DB):

```bash
npm install
npm run db:generate   # runs prisma generate
npm run db:push       # prisma db push (no migration history yet)
```

4. (Optional) Seed sample data:

```bash
npm run db:seed
```

5. Commit & push code (if not already). Import project into Vercel. Confirm env vars.
6. Deploy. After deploy:
   - Visit /register → create initial account.
   - In DB, update that user’s `role` to `ADMIN` and `approved = true`, or use an admin creation API if later added.
   - Login → /admin/dashboard should load without 403.

---

## 4. Schema Changes After Initial Launch (Recommended Path)

1. Develop locally against Postgres (avoid drifting from production):
```bash
# Make model changes in prisma/schema.prisma
npx prisma migrate dev --name add_some_feature
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: add_some_feature schema"
```

2. Push branch → open PR → merge.

3. Apply in production (choose one):
   - CI / Vercel build hook (custom step): run `npx prisma migrate deploy` before `next build`.
   - Manual (temporary shell): set DATABASE_URL + DIRECT_URL (if any) then:
     ```bash
     npx prisma migrate deploy
     ```

4. Verify:
   - Check new columns/tables exist.
   - Hit impacted API routes for 200 responses.

Fallback (early prototype only): `npx prisma db push` (no migration history). Migrate properly once stable.

---

## 5. Seeding / Admin Bootstrap

- Seed script: [prisma/seed.ts](prisma/seed.ts)
```bash
npm run db:seed
```
- If seeding is skipped: manually promote first user:
```sql
UPDATE users SET role='ADMIN', approved=true WHERE email='you@example.com';
```

---

## 6. Operational Checks Post-Deploy

| Check | How |
| ----- | --- |
| Auth working | Register + login flow; inspect `auth-token` cookie |
| Admin access | /admin/dashboard returns UI (not 401/403) |
| Streaming config | Admin → Stream tab; set `streamUrl` and confirm player loads |
| Devotional endpoint | curl /api/rhapsody?refresh=1 (200 + JSON) |
| Banners | Create banner → appears on /dashboard |
| Attendance | Check-in flow via `/api/attendance/checkin` triggered by UI |

---

## 7. Zero / Low Downtime Changes

- Add columns with defaults or nullable first; backfill async; then enforce constraints in a later migration.
- Avoid destructive changes in peak usage windows.
- For large migrations: create staging DB → test migrate → snapshot backup → run production migration.

---

## 8. Rollback Strategy

1. App regression only (schema unchanged): redeploy previous commit.
2. Schema migration caused issue:
   - Restore DB from latest backup (see [docs/OPERATIONS.md](docs/OPERATIONS.md) > Database Operations).
   - Redeploy previous commit pointing to restored DB.
3. Emergency hotfix: patch code → redeploy; avoid ad‑hoc DB edits unless documented.

Always keep automated daily backups enabled on the DB host.

---

## 9. Common Commands Cheat Sheet

```bash
# Init / greenfield schema
npm run db:push

# Create migration (dev)
npx prisma migrate dev --name add_field

# Apply committed migrations (prod/staging)
npx prisma migrate deploy

# Regenerate client
npm run db:generate

# Seed (optional, idempotent on conflicts)
npm run db:seed

# Introspect (if external changes)
npx prisma db pull
```

---

## 10. Troubleshooting

| Symptom | Likely Cause | Action |
| ------- | ------------ | ------ |
| 401 everywhere | Missing / wrong JWT_SECRET | Set env & redeploy |
| 403 on admin routes | User not ADMIN or not approved | Promote & approve in DB |
| DB connection errors | Wrong DATABASE_URL / no SSL | Verify string, add `?sslmode=require` |
| Too many connections | No pooling | Add Prisma Accelerate or pgBouncer |
| Devotional empty | Upstream changed/blocked | Use `?refresh=1`, inspect logs, adjust parser |
| Email not delivered | SMTP misconfig | Verify credentials / SPF/DKIM / logs |
| Player fails | Bad HLS URL / CORS | Fetch .m3u8 manually; set correct headers |

---

## 11. File Reference Index

- Schema: [prisma/schema.prisma](prisma/schema.prisma)
- Seed script: [prisma/seed.ts](prisma/seed.ts)
- Operations runbook: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- Product overview: [docs/PRODUCT.md](docs/PRODUCT.md)
- Deployment section (primary): [README.md](README.md)

---

## 12. Minimal First-Time Quick Script (Optional)

```bash
# AFTER setting DATABASE_URL (and DIRECT_URL if needed)
npm ci
npm run db:generate
npm run db:push
npm run db:seed   # optional
```

Deploy, promote admin, configure stream & service settings.

---

## 13. Upgrade Notes

- Upgrade Prisma: bump version → `npm install` → `npx prisma generate` → run migrations.
- Node version bumps: confirm Vercel project uses the same major runtime.
- Library updates: keep incremental; test auth, admin tabs, streaming.

---

## 14. Security Reminders

- Rotate `JWT_SECRET` only with notice (forces re-login).
- Never expose raw DB credentials in logs.
- Validate all admin requests server-side (see `/api/admin/*` routes such as `/api/admin/users` in code).

---
