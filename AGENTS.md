# AGENTS.md — Coding Guidelines

This document guides AI coding assistants when making changes to the Christ Embassy Ireland app.

---

## Project Snapshot

- **Type**: Single Next.js app (not a monorepo)
- **Stack**: Next.js 16, React 19, TypeScript 5.9, Tailwind 4, Prisma 6 + PostgreSQL
- **Auth**: JWT in HTTP-only cookies; magic link login; Open Events for guest access
- **Deployment**: Dokploy (self-hosted PaaS)

---

## Root Setup Commands

```bash
# Install dependencies (auto-runs prisma generate)
npm install

# Start PostgreSQL locally
docker compose up -d

# Full DB setup (generate + migrate deploy + seed)
npm run db:setup

# Dev server (Turbopack)
npm run dev

# Build & Start
npm run build && npm start

# Lint
npm run lint
```

---

## Universal Conventions

- **TypeScript**: Strict mode enabled
- **Code style**: ESLint 9 flat config, Tailwind utility-first
- **Commits**: Conventional Commits format (`type(scope): description`)
- **PRs**: One logical change per PR; descriptive titles
- **Git Workflow**: Create feature branch → commit frequently → never work on main directly

---

## Security & Secrets

- Never commit real credentials; `.env` stays local
- Admin routes must enforce `role === 'ADMIN'` via JWT
- Cookies: `httpOnly` + `secure` in production
- Return generic error messages to prevent information disclosure

---

## Database Migrations (REQUIRED)

**⚠️ CRITICAL: Always use migrations, never `db push` for schema changes**

### Migration Workflow

**For Development (creating new migrations):**
```bash
# After modifying prisma/schema.prisma, create a migration
npm run db:migrate

# Or create migration without applying (to review SQL first)
npm run db:migrate:create
```

**For Production/CI (applying migrations):**
```bash
# Deploy pending migrations (used in production)
npm run db:deploy

# Check migration status
npm run db:status
```

### Migration Rules

1. **Never use `db push`** - Always create migrations with `db:migrate`
2. **Commit migration files** - Always commit the `prisma/migrations/` folder
3. **Test migrations locally** - Run `db:deploy` locally before pushing
4. **Name migrations clearly** - Use descriptive names like `add_user_roles`, `create_events_table`
5. **One change per migration** - Don't bundle unrelated schema changes

---

## JIT Index (what to open, not what to paste)

### Directory Map

| Area | Path | Purpose |
|------|------|---------|
| App Routes | `src/app/` | Next.js App Router pages and API routes |
| Components | `src/components/` | React components (admin/ for dashboard) |
| Utilities | `src/lib/` | Prisma, auth, validation, errors, email |
| Types | `src/types/index.ts` | Shared TypeScript interfaces |
| Contexts | `src/contexts/AuthContext.tsx` | Global auth state |
| Hooks | `src/hooks/` | Custom React hooks |
| Database | `prisma/schema.prisma` | Prisma schema (PostgreSQL) |

### Quick Find Commands

```bash
# Find API route handlers
rg -n "export (async function|const) (GET|POST|PUT|DELETE|PATCH)" src/app/api

# Find React components
rg -n "export (default function|function|const)" src/components

# Find Prisma models
rg -n "^model " prisma/schema.prisma

# Find Zod schemas
rg -n "z\.(object|string|number)" src/lib/validation.ts
```

---

## Patterns & Conventions

### Use Existing Utilities (DO NOT re-implement)

| Need | Use | Example |
|------|-----|---------|
| Database | `prisma` from `src/lib/prisma.ts` | See `src/app/api/admin/users/route.ts` |
| JWT | `signToken`/`verifyToken` from `src/lib/auth.ts` | See `src/app/api/auth/login/route.ts` |
| Validation | Zod schemas from `src/lib/validation.ts` | See `src/app/api/auth/register/route.ts` |
| Errors | `errorToResponse()` from `src/lib/errors.ts` | See any API route |
| Rate Limit | `src/lib/rateLimit.ts` | See `src/app/api/auth/login/route.ts` |
| Types | `src/types/index.ts` | `SessionUser`, `User`, `Banner` |

### API Route Pattern

```typescript
// ✅ DO: Use centralized error handling
import { ValidationError, errorToResponse } from '@/lib/errors'
if (!valid) {
  const err = new ValidationError('Invalid input')
  return NextResponse.json(errorToResponse(err), { status: err.statusCode })
}

// ✅ DO: Admin routes check role
if (session.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Component Pattern

- ✅ DO: Follow `src/components/admin/BannerManagement.tsx` for admin CRUD
- ✅ DO: Use React Hook Form + Zod for forms (see `src/app/(auth)/register/RegisterPageContent.tsx`)
- ✅ DO: Use `lucide-react` for icons
- ❌ DON'T: Add new icon libraries

---

## Touch Points / Key Files

| Purpose | File |
|---------|------|
| Auth logic | `src/lib/auth.ts` |
| Prisma client | `src/lib/prisma.ts` |
| Error classes | `src/lib/errors.ts` |
| Validation schemas | `src/lib/validation.ts` |
| Shared types | `src/types/index.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| DB schema | `prisma/schema.prisma` |

---

## Common Tasks

### Add Admin Feature
1. API: `src/app/api/admin/{feature}/route.ts` (enforce `ADMIN` role)
2. Component: `src/components/admin/{Feature}Management.tsx`
3. Wire into: `src/app/admin/dashboard/page.tsx`

### Add Public API
1. Route: `src/app/api/{feature}/route.ts`
2. Validation: Add Zod schema to `src/lib/validation.ts`
3. Types: Add to `src/types/index.ts`

### DB Schema Change
1. Edit `prisma/schema.prisma`
2. Create migration: `npm run db:migrate` (dev) or `npm run db:migrate:create` (to review SQL)
3. Test migration: `npm run db:deploy` (verifies it works like production)
4. Commit the migration files in `prisma/migrations/`
5. Update types in `src/types/index.ts` if needed

---

## Common Gotchas

- **Prisma Accelerate**: `DATABASE_URL` with `prisma://` scheme enables connection pooling
- **Cookie auth**: JWT in `httpOnly` cookie, not localStorage
- **Open Events**: Allow unauthenticated access during active events (check `useOpenEvent` hook)
- **Rhapsody API**: Upstream endpoint changes without notice (see `docs/RhapsodyDaily.md`)

---

## Pre-PR Checks

```bash
npm run lint && npm run build
```

---

## References

| Doc | Purpose |
|-----|---------|
| `README.md` | Setup, env vars, deployment |
| `docs/PRODUCT.md` | Product scope and personas |
| `docs/DEPLOYMENT_GUIDE.md` | Production deployment |
| `docs/DOKPLOY_DEPLOYMENT.md` | Dokploy-specific deployment guide |
| `docs/OPERATIONS.md` | Runbook and troubleshooting |
| `docs/BANNER_DESIGN_GUIDE.md` | Banner specs |
| `docs/RhapsodyDaily.md` | Devotional API docs |

---

## Definition of Done

- [ ] `npm run lint` passes
- [ ] Changes tested locally (login, dashboard, affected flows)
- [ ] No secrets or PII in code or logs
- [ ] Migration created if schema changed
- [ ] Commits follow conventional format

---

## Non-Goals

- Do not introduce heavy rewrites or new frameworks without buy-in
- Do not add analytics/tracking outside documented admin features
- Do not change auth model without explicit direction
- Do not modify CI/CD workflows unless explicitly requested
