# CLAUDE.md — AI Assistant Guide

This file provides comprehensive guidance for AI assistants working with the Christ Embassy Ireland codebase.

## Project Overview

Christ Embassy Ireland is a modern online church platform that provides:
- Passwordless authentication via magic links
- Live HLS streaming for services
- Daily devotional content (Rhapsody of Realities)
- Open Events for guest access without authentication
- Admin dashboard for user management, analytics, and content management

**Type**: Single Next.js application (not a monorepo)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Server Components, Turbopack) |
| UI | React 19, Tailwind CSS 4, lucide-react icons |
| Language | TypeScript 5.9 (strict mode enabled) |
| ORM/Database | Prisma 6 + PostgreSQL |
| Authentication | JWT in HTTP-only cookies, magic link login |
| Validation | Zod 4 |
| Streaming | HLS.js for video playback |
| Analytics | Recharts |
| Deployment | Dokploy (self-hosted PaaS) |

## Directory Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   ├── admin/dashboard/     # Admin dashboard
│   ├── api/                 # API route handlers
│   │   ├── admin/           # Admin-only endpoints
│   │   ├── auth/            # Authentication endpoints
│   │   ├── attendance/      # Attendance tracking
│   │   ├── banners/         # Banner management
│   │   ├── open-events/     # Guest access events
│   │   ├── prayer-requests/ # Prayer submissions
│   │   ├── rhapsody/        # Daily devotional
│   │   ├── salvation/       # Salvation responses
│   │   ├── service-schedules/ # Service times
│   │   ├── service-settings/  # Dashboard config
│   │   ├── stream/          # Stream settings
│   │   └── viewers/         # Viewer session tracking
│   └── dashboard/           # Member dashboard
├── components/
│   ├── admin/               # Admin UI components
│   └── *.tsx                # Shared components
├── contexts/
│   └── AuthContext.tsx      # Global authentication state
├── hooks/
│   └── useOpenEvent.ts      # Open event detection hook
├── lib/
│   ├── auth.ts              # JWT signing/verification
│   ├── adminAuth.ts         # Admin auth helpers
│   ├── constants.ts         # Shared constants
│   ├── dates.ts             # Date utilities
│   ├── email.ts             # Nodemailer setup
│   ├── errors.ts            # Error classes and handling
│   ├── prisma.ts            # Prisma client (Accelerate-aware)
│   ├── rateLimit.ts         # Rate limiting utilities
│   ├── serviceSettings.ts   # Settings cache
│   └── validation.ts        # Zod schemas
└── types/
    └── index.ts             # Shared TypeScript types
prisma/
├── schema.prisma            # Database schema
├── migrations/              # Migration history (ALWAYS commit)
└── seed.ts                  # Database seeding
```

## Quick Start Commands

```bash
# Install dependencies (auto-runs prisma generate)
npm install

# Start PostgreSQL locally
docker compose up -d

# Full DB setup (generate + migrate deploy + seed)
npm run db:setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## Database Commands

```bash
# Create a new migration (development)
npm run db:migrate

# Create migration without applying (review SQL first)
npm run db:migrate:create

# Deploy pending migrations (production/CI)
npm run db:deploy

# Check migration status
npm run db:status

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed
```

## Critical Conventions

### Database Migrations (REQUIRED)

**NEVER use `prisma db push` for schema changes.** Always create migrations:

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` to create and apply migration
3. Commit the migration files in `prisma/migrations/`
4. Test with `npm run db:deploy` locally before pushing

### Use Existing Utilities (DO NOT re-implement)

| Need | Use | Location |
|------|-----|----------|
| Database | `prisma` | `src/lib/prisma.ts` |
| JWT auth | `signToken`, `verifyToken` | `src/lib/auth.ts` |
| Admin auth check | `verifyAdminFromRequest` | `src/lib/adminAuth.ts` |
| Validation | Zod schemas | `src/lib/validation.ts` |
| Error handling | `AppError`, `errorToResponse` | `src/lib/errors.ts` |
| Rate limiting | `checkRateLimit` | `src/lib/rateLimit.ts` |
| Types | `SessionUser`, `User`, etc. | `src/types/index.ts` |

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Admin check (for admin routes)
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Business logic with Prisma
    const data = await prisma.someModel.findMany({ ... })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Error Classes

Use the centralized error classes from `src/lib/errors.ts`:

```typescript
import { ValidationError, NotFoundError, errorToResponse } from '@/lib/errors'

// Throw specific errors
if (!valid) {
  const err = new ValidationError('Invalid input')
  return NextResponse.json(errorToResponse(err), { status: err.statusCode })
}

// Available error classes:
// - ValidationError (400)
// - AuthenticationError (401)
// - AuthorizationError (403)
// - NotFoundError (404)
// - ConflictError (409)
// - RateLimitError (429)
// - InternalError (500)
// - ServiceUnavailableError (503)
```

### Component Patterns

- Follow `src/components/admin/BannerManagement.tsx` for admin CRUD patterns
- Use `lucide-react` for icons (DO NOT add new icon libraries)
- Use Tailwind CSS for styling (utility-first approach)
- Forms: Use controlled components with validation

### TypeScript

- Strict mode is enabled (`tsconfig.json`)
- Path alias: `@/*` maps to `./src/*`
- Define types in `src/types/index.ts` for shared interfaces
- Use `interface` for object types, `type` for unions/intersections

### Code Style

- ESLint 9 flat config (`eslint.config.mjs`)
- Unused variables prefixed with `_` are ignored
- React hooks rules enforced
- Run `npm run lint` before committing

### Git Workflow

- Conventional Commits format: `type(scope): description`
  - Examples: `feat(auth): add magic link login`, `fix(stream): handle HLS errors`
- One logical change per PR
- Never work directly on main
- Always commit migration files

## Key Files Reference

| Purpose | File |
|---------|------|
| Auth logic | `src/lib/auth.ts` |
| Admin auth | `src/lib/adminAuth.ts` |
| Prisma client | `src/lib/prisma.ts` |
| Error handling | `src/lib/errors.ts` |
| Validation schemas | `src/lib/validation.ts` |
| Shared types | `src/types/index.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| DB schema | `prisma/schema.prisma` |
| Rate limiting | `src/lib/rateLimit.ts` |

## Common Tasks

### Add Admin Feature

1. Create API route: `src/app/api/admin/{feature}/route.ts`
   - Enforce `ADMIN` role check
2. Create component: `src/components/admin/{Feature}Management.tsx`
3. Wire into admin dashboard: `src/app/admin/dashboard/page.tsx`

### Add Public API

1. Create route: `src/app/api/{feature}/route.ts`
2. Add Zod schema to `src/lib/validation.ts`
3. Add types to `src/types/index.ts`

### Database Schema Change

1. Edit `prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Commit migration files in `prisma/migrations/`
4. Update types in `src/types/index.ts` if needed

### Add New Component

1. Create in `src/components/` (or `src/components/admin/` for admin)
2. Use existing patterns from similar components
3. Import icons from `lucide-react`
4. Use Tailwind for styling

## Security Guidelines

- Never commit credentials (`.env` is gitignored)
- Admin routes MUST enforce `role === 'ADMIN'` via JWT
- Cookies: `httpOnly` + `secure` in production
- Return generic error messages to prevent information disclosure
- Use honeypot fields for anti-bot protection (see register form)
- Validate all input with Zod schemas

## Prisma Models

Key models in `prisma/schema.prisma`:

- `User` - Members with email, role (USER/ADMIN), approved status
- `Service` - Dated services with optional HLS URL
- `Attendance` - User check-ins to services
- `Banner` - Announcement banners
- `StreamSettings` - Live stream configuration
- `ServiceSettings` - Dashboard labels, branding, SEO
- `OpenEvent` - Special events allowing guest access
- `OpenEventAttendance` - Guest/member attendance tracking
- `ServiceSchedule` - Recurring service times
- `CTASettings` - Call-to-action button configuration
- `PrayerRequest` - User prayer submissions
- `SalvationResponse` - Salvation decisions

## Environment Variables

Required for development:
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional:
```env
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM  # Email
RHAPSODY_BASE_URL, RHAPSODY_LANG  # Devotional content
DIRECT_URL  # Prisma Accelerate
```

## Pre-Commit Checklist

```bash
npm run lint && npm run build
```

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Changes tested locally (login, dashboard, affected flows)
- [ ] No secrets or PII in code or logs
- [ ] Migration created if schema changed
- [ ] Commits follow conventional format

## Common Gotchas

1. **Prisma Accelerate**: `DATABASE_URL` with `prisma://` scheme enables connection pooling
2. **Cookie auth**: JWT stored in `httpOnly` cookie, not localStorage
3. **Open Events**: Allow unauthenticated access during active events (check `useOpenEvent` hook)
4. **Rhapsody API**: Upstream endpoint may change (see `docs/RhapsodyDaily.md`)
5. **Turbopack**: Used for both dev and build (`next dev --turbopack`, `next build --turbopack`)

## Non-Goals

- Do not introduce heavy rewrites or new frameworks without explicit direction
- Do not add analytics/tracking outside documented admin features
- Do not change auth model without explicit direction
- Do not modify CI/CD workflows unless explicitly requested
- Do not add new icon libraries (use `lucide-react`)

## Additional Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Setup, env vars, deployment overview |
| `AGENTS.md` | Detailed coding guidelines |
| `docs/PRODUCT.md` | Product scope and personas |
| `docs/DEPLOYMENT_GUIDE.md` | Production deployment |
| `docs/DOKPLOY_DEPLOYMENT.md` | Dokploy-specific deployment |
| `docs/OPERATIONS.md` | Runbook and troubleshooting |
| `docs/BANNER_DESIGN_GUIDE.md` | Banner specifications |
| `docs/RhapsodyDaily.md` | Devotional API documentation |
| `docs/ADMIN_BOOTSTRAP_GUIDE.md` | First admin setup |
| `docs/OPEN_EVENTS_ADMIN_GUIDE.md` | Open events management |
