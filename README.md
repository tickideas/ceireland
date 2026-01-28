# Christ Embassy Ireland - Online Church Platform

A modern, intuitive, and beautiful online church platform for Christ Embassy Ireland, built with Next.js 16 (App Router) and React 19. It delivers passwordless authentication, live streaming, user management, and comprehensive analytics so congregations can gather and stay informed from anywhere.

## 📚 Documentation

- Product overview and scope: `docs/PRODUCT.md`
- Guidance for human/AI contributors: `AGENTS.md`
- Operations runbook: `docs/OPERATIONS.md`
- Deployment guide: `docs/DEPLOYMENT_GUIDE.md`
- Open Events Admin Guide: `docs/OPEN_EVENTS_ADMIN_GUIDE.md`

## ✨ Features

### For Church Members
- **Passwordless Authentication**: Login with magic links sent to email — no password fatigue.
- **Live Streaming**: Native HLS playback with `hls.js` fallback for browsers without built-in support.
- **Daily Devotional**: Rhapsody of Realities integration with language overrides.
- **Open Event Access**: Attend special services during active Open Events without creating an account.
- **Announcements & Schedule**: Dynamic banner carousel and configurable service schedule.

### For Church Administrators
- **User Management**: Approve/reject registrations, manage existing members, and import CSV/JSON records.
- **Analytics Dashboard**: Attendance trends, viewer sessions, and CSV exports.
- **Open Events**: Create public events, monitor anonymous attendance, and deactivate with one click.
- **Stream & Service Settings**: Manage stream URLs/posters and update dashboard labels/backgrounds.
- **Content Management**: Configure banners, service info, and devotional settings from a single dashboard.

### Platform Capabilities
- **Security & Auth**: JWT cookies, admin role enforcement, privacy-focused audit messages, anti-bot honeypot fields, and generic error responses to prevent information disclosure.
- **Rate Limiting**: Centralized rules to keep auth and API calls healthy.
- **Viewer Tracking**: Real-time viewer heartbeats for stream analytics.
- **Email Delivery**: Nodemailer-powered notifications with pluggable SMTP settings.
- **Prisma Accelerate**: Optional extension for accelerated database access alongside PostgreSQL.

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16.1.1** (App Router, Server Components, Turbopack) |
| UI | **React 19.2.3**, **Tailwind CSS 4.1.18**, `lucide-react` 0.562.0 icons |
| Language & Tooling | TypeScript 5.9.3, ESLint 9.39.2, Turbopack dev/build pipeline |
| Data & ORM | Prisma 6.19.1, PostgreSQL, optional Prisma Accelerate extension |
| Authentication | JWT + secure cookies, magic-link login via Nodemailer 7.0.12 |
| Forms & Validation | React Hook Form 7.69.0, Zod 4.2.1 |
| Streaming & Media | HLS.js 1.6.15, poster image support, viewer session tracking |
| Analytics & Visualization | Recharts 3.6.0 |
| Utilities | `tsx` 4.21.0 for scripts, `cheerio` 1.1.2 for devotional content parsing, `react-dropzone` 14.3.8 for file uploads |

## 🏛 Architecture Overview
- **App Router-first**: Auth, admin, dashboard, and public routes separated via route groups in `src/app`.
- **API Routes**: Serverless handlers under `src/app/api` power admin, auth, attendance, stream, open events, viewers, banners, and content endpoints.
- **Shared Utilities**: `src/lib` centralizes Prisma configuration, rate limiting, validation, email, and auth helpers.
- **State Management**: React Context (`AuthContext`) and custom hooks (`useOpenEvent`) orchestrate session state and guest access.
- **Database Models**: Prisma schema tracks users, services, attendance, banners, stream/service settings, viewer sessions, open events, and open event attendance.

## 🛠️ Project Structure
```
src/
├── app/
│   ├── (auth)/              # Registration, login, magic-link flows
│   ├── admin/               # Admin dashboard shell
│   ├── api/                 # App Router API endpoints
│   │   ├── admin/           # Admin-only endpoints (users, banners, stream, analytics, etc.)
│   │   ├── attendance/      # Attendance check-in
│   │   ├── auth/            # Authentication (register, login, logout, me)
│   │   ├── banners/         # Public banner retrieval
│   │   ├── health/          # Health check endpoint
│   │   ├── open-events/     # Open events and guest attendance
│   │   ├── rhapsody/        # Daily devotional content
│   │   ├── service-settings/# Public service settings
│   │   ├── stream/          # Public stream settings
│   │   └── viewers/         # Viewer session tracking
│   └── dashboard/           # Member/guest dashboard experience
├── components/
│   ├── admin/               # Admin UI modules
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── AttendanceReport.tsx
│   │   ├── BannerManagement.tsx
│   │   ├── OpenEventManager.tsx
│   │   ├── ServiceSettingsManagement.tsx
│   │   ├── StreamManagement.tsx
│   │   ├── UserImport.tsx
│   │   └── UserManagement.tsx
│   ├── BannerCarousel.tsx
│   ├── HLSPlayer.tsx
│   ├── OpenEventAttendanceTracker.tsx
│   └── RhapsodyDaily.tsx
├── contexts/
│   └── AuthContext.tsx      # Global authentication state
├── hooks/
│   └── useOpenEvent.ts      # Open event access detection
├── lib/
│   ├── auth.ts              # JWT signing and verification
│   ├── constants.ts         # Shared constants and enums
│   ├── email.ts             # Nodemailer setup and email helpers
│   ├── errors.ts            # Centralized error handling
│   ├── prisma.ts            # Prisma client (Accelerate-aware)
│   ├── rateLimit.ts         # Rate limiting utilities
│   └── validation.ts        # Zod schemas for API validation
├── types/
│   └── index.ts             # Shared TypeScript types (SessionUser, User, Banner, ApiResponse, etc.)
prisma/
├── schema.prisma            # PostgreSQL data model
└── seed.ts                  # Database seeding helpers
```

## 🚀 Getting Started

### Prerequisites
- Node.js **18.18+** (required by Next.js 16 and React 19)
- npm 9+ (bundled with Node) or pnpm/yarn if you prefer
- PostgreSQL database (local Docker or hosted service)
- Docker (optional, for local PostgreSQL)

### Local PostgreSQL with Docker

The easiest way to run PostgreSQL locally is with Docker:

```bash
# Start PostgreSQL container
docker compose up -d

# Verify it's running
docker compose ps
```

This creates a PostgreSQL 16 database with:
- **User**: `ceireland`
- **Password**: `ceireland_dev_password`
- **Database**: `ceireland`
- **Port**: `5432`

To stop the database:
```bash
docker compose down
```

To stop and remove all data:
```bash
docker compose down -v
```

### Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ceireland
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
   > The `postinstall` script automatically runs `prisma generate` and `prisma db push`.
   
3. **Configure environment variables**
   Create a `.env` (or `.env.local`) file in the project root with the following baseline configuration:
   ```env
   # Database (PostgreSQL)
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
   # Optional when using Prisma Accelerate (recommended for production)
   DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"

   # Auth & App
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Email (magic links + notifications)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="noreply@yourchurch.com"

   # Optional devotional overrides
   RHAPSODY_BASE_URL="https://read.rhapsodyofrealities.org"
   RHAPSODY_LANG="english"
   ```
   > **Tip:** Leave SMTP credentials empty in local development to skip email sending; the app will log a warning and continue.
   
4. **Set up the database**
   ```bash
   npm run db:setup
   ```
   This script runs `prisma generate`, `prisma db push`, and seeds starter data via `prisma/seed.ts`.
   
5. **Run the development server**
   ```bash
   npm run dev
   ```
   Turbopack is enabled by default for faster builds and hot module replacement.
   
6. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Useful Scripts
| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with Turbopack |
| `npm run build` | Production build with Turbopack |
| `npm start` | Run the compiled production build |
| `npm run lint` | Run ESLint across the project |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed data without pushing schema changes |
| `npm run db:setup` | Generate + push + seed in one command (recommended for fresh setups) |
| `npm run db:push:prod` | Push schema changes using production Prisma schema |
| `npm run db:migrate:deploy:prod` | Deploy migrations in production (when using `prisma migrate`) |

## 📱 Usage

### For Church Members
1. **Register**: Fill out the registration form with your details
2. **Wait for Approval**: An admin will approve your registration
3. **Login**: Use your email to receive a magic link for login
4. **Access Services**: Watch live streams, read daily devotionals, and view announcements

### For Church Administrators
1. **Login**: Use your admin credentials
2. **Approve Users**: Review and approve new user registrations
3. **Manage Content**: Create banners and manage service information
4. **Configure Streaming**: Set up stream URLs and poster images
5. **Create Open Events**: Allow public access during special events
6. **View Analytics**: Monitor attendance, viewer sessions, and engagement trends
7. **Import Users**: Bulk import existing congregation members via CSV/JSON

## 🔧 Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (use `prisma://` prefix for Accelerate) | ✅ |
| `DIRECT_URL` | Direct PostgreSQL connection when using Prisma Accelerate | Optional |
| `JWT_SECRET` | Secret used to sign JWT auth tokens | ✅ |
| `NEXT_PUBLIC_APP_URL` | Public base URL (used in emails and client code) | ✅ |
| `SMTP_HOST` | SMTP server host for magic-link emails | ✅ (production) |
| `SMTP_PORT` | SMTP server port | ✅ (production) |
| `SMTP_USER` | SMTP username | ✅ (production) |
| `SMTP_PASS` | SMTP password or app-specific password | ✅ (production) |
| `SMTP_FROM` | From email address for notifications | ✅ (production) |
| `RHAPSODY_BASE_URL` | Override devotional content base URL | Optional |
| `RHAPSODY_LANG` | Default devotional language (e.g., `english`) | Optional |

## 📡 Key API Routes
- `/api/auth/*` – Registration, login (magic link), logout, and session checks
- `/api/admin/users*` – List, approve, and manage users
- `/api/admin/banners*` – CRUD for announcement banners
- `/api/admin/stream` – Read/update live stream settings
- `/api/admin/service-settings` – Manage dashboard labels and background imagery
- `/api/admin/analytics*` – Summary metrics, time-series data, and CSV export
- `/api/admin/open-events*` – Manage public events and attendance
- `/api/attendance/checkin` – Record member attendance for active services
- `/api/stream` & `/api/service-settings` – Public read-only endpoints consumed by the UI
- `/api/rhapsody` – Fetch daily devotional content (supports language/date params)
- `/api/viewers/*` – Viewer session heartbeat tracking and live counts
- `/api/open-events/active` – Check for active open events (public access)
- `/api/banners` – Fetch active banners for display

## 📧 Email Configuration
The app uses Nodemailer to send approval and magic-link emails. For Gmail:
1. Enable 2-Step Verification on your Google Account
2. Create an App Password (16-digit)
3. Use the app password for `SMTP_PASS` in your `.env` file

For other email providers, configure the appropriate SMTP settings.

## 🧪 Testing & Validation
- Exercise login, admin workflows, member dashboard, and open events whenever you touch related code
- Use the `Open Events` admin tab to simulate guest access flows
- Run `npm run lint` before submitting changes to catch formatting or typing issues quickly
- Test stream playback with different browsers to ensure HLS.js fallback works correctly

## 🚀 Deployment

### Vercel (Recommended)
1. Push your repo to GitHub/GitLab/Bitbucket
2. In Vercel, click **New Project** and import the repository
3. Framework preset: Next.js (Node 18+). Turbopack builds are supported out of the box
4. Add environment variables (see above). Point `DATABASE_URL` (and `DIRECT_URL` if using Accelerate) at your production PostgreSQL instance
5. Run the initial Prisma migrations from your local machine: `npm run db:push` (or use `prisma migrate deploy` in CI)
6. Deploy and verify admin dashboard functionality (stream settings, service info, banners, open events)

Environment variables to configure in Vercel:
- `DATABASE_URL`: PostgreSQL connection string (from Neon/Supabase/Vercel Postgres)
- `JWT_SECRET`: Strong random secret (rotate if leaked)
- `NEXT_PUBLIC_APP_URL`: Your Vercel domain, e.g. `https://your-app.vercel.app`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Email provider settings
- Optional: `RHAPSODY_BASE_URL`, `RHAPSODY_LANG`

### Other Platforms
- Provision a managed PostgreSQL database and configure env vars
- Build: `npm run build`
- Start: `npm start`
- Ensure your hosting stack forwards requests to Next.js' Node server

## ✅ Production Checklist

- **Secrets**: Set a strong `JWT_SECRET`; rotate credentials if compromised. Secure `.env` values
- **Database**: Use managed PostgreSQL with backups, connection pooling, and restricted network access
- **Migrations**: Prefer `prisma migrate deploy` in CI for production schema changes (or `prisma db push` for early prototyping)
- **SMTP**: Send from a verified domain with SPF/DKIM/DMARC enabled. Confirm `SMTP_FROM` matches the verified domain
- **Cookies & HTTPS**: Enforce HTTPS; `auth-token` cookies are `httpOnly` + `secure` in production
- **Admin Bootstrap**: Register an account, promote it to `ADMIN` in the database, and confirm `/admin/dashboard` access
- **Streaming**: Host HLS over HTTPS and configure CORS if stream origin differs from the app domain. Configure poster image
- **Observability**: Add uptime monitoring and error tracking. Review server logs for 401/403 spikes
- **Privacy**: Store only required PII and avoid logging sensitive data. Document retention and export policies
- **Backups**: Test database restore procedures regularly. Document a recovery runbook

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding guidelines in `AGENTS.md`
4. Run linting/tests as appropriate
5. Submit a pull request with context and screenshots when relevant

See `AGENTS.md` for detailed guidelines on working with this codebase.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Prayer & Support

May this platform serve as a blessing to your church community and help spread the gospel message effectively. For support, please open an issue in the repository.

---

*"But seek first the kingdom of God and his righteousness, and all these things will be added to you."* — Matthew 6:33
