# Quick Reference - Phase 1 Improvements

**Quick access guide to all new Phase 1 features**

---

## 🔐 Rate Limiting

### Configuration
```typescript
import { RATE_LIMITS } from '@/lib/constants'

// Current limits (church-friendly):
RATE_LIMITS.LOGIN        // 10 attempts per 15 minutes
RATE_LIMITS.REGISTER     // 5 attempts per hour
RATE_LIMITS.API_GENERAL  // 1000 requests per 15 minutes
RATE_LIMITS.ADMIN        // 100 requests per 15 minutes
```

### Usage
```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit'

// Check rate limit
const result = checkRateLimit(`login:${email}`, RATE_LIMITS.LOGIN)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 429 })
}

// Reset on success
resetRateLimit(`login:${email}`)
```

---

## 📊 Health Check

### Endpoint
```bash
GET /api/health
```

### Response
```json
{
  "timestamp": "2024-10-02T12:00:00.000Z",
  "status": "healthy",
  "version": "0.1.0",
  "environment": "production",
  "checks": {
    "database": { "status": "ok", "responseTime": 12 },
    "memory": { "status": "ok", "usage": 45, "limit": 128, "percentage": 35 },
    "rateLimit": { "status": "ok", "storeSize": 23 }
  },
  "responseTime": 15
}
```

### Monitoring Setup
```bash
# Curl
curl http://your-domain.com/api/health

# Uptime monitoring (Datadog, New Relic, etc.)
# Point to: https://your-domain.com/api/health
# Expect: 200 status code for healthy
# Expect: 503 status code for unhealthy
```

---

## 🚨 Error Handling

### Error Classes
```typescript
import {
  ValidationError,       // 400 - Bad input
  AuthenticationError,   // 401 - Need to login
  AuthorizationError,    // 403 - No permission
  NotFoundError,         // 404 - Resource not found
  ConflictError,         // 409 - Already exists
  RateLimitError,        // 429 - Too many requests
  InternalError,         // 500 - Server error
  ServiceUnavailableError // 503 - Service down
} from '@/lib/errors'

// Usage
throw new ValidationError('Email is required')
throw new NotFoundError('User not found')
throw new ConflictError('Email already exists')
```

### Utilities
```typescript
import { errorToResponse, logError, isAppError } from '@/lib/errors'

// Convert to JSON
try {
  // ... code
} catch (error) {
  if (isAppError(error)) {
    const response = errorToResponse(error)
    return NextResponse.json(response, { status: error.statusCode })
  }
  // Handle unknown errors
}

// Log appropriately
logError(error, 'LoginEndpoint')
```

---

## ✅ Input Validation

### Available Schemas
```typescript
import {
  loginSchema,              // Login validation
  registerSchema,           // Registration validation
  updateUserSchema,         // User update validation
  userApprovalSchema,       // Approval validation
  userRoleSchema,           // Role change validation
  bannerSchema,             // Banner creation
  updateBannerSchema,       // Banner update
  streamSettingsSchema,     // Stream settings
  serviceSettingsSchema,    // Service settings
  paginationSchema,         // Pagination queries
  attendanceQuerySchema,    // Attendance queries
  analyticsQuerySchema,     // Analytics queries
  bulkUserImportSchema,     // Bulk import
} from '@/lib/validation'
```

### Usage
```typescript
// Parse and validate (throws on error)
const data = loginSchema.parse(body)

// Safe validation (no throw)
const result = safeValidate(loginSchema, body)
if (!result.success) {
  const errors = formatZodErrors(result.errors)
  return NextResponse.json({ errors }, { status: 400 })
}

// Use validated data
const data = result.data // Type-safe!
```

### Example Integration
```typescript
import { loginSchema, ValidationError } from '@/lib/validation'
import { errorToResponse } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    // Validate input
    const body = await request.json()
    const { email } = loginSchema.parse(body)
    
    // ... rest of logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(formatZodErrors(error).join(', '))
    }
    throw error
  }
}
```

---

## 🎯 Constants

### Available Constants
```typescript
import {
  AUTH,              // JWT expiry, cookie settings
  RATE_LIMITS,       // Rate limit configurations
  VIEWER_TRACKING,   // Heartbeat intervals
  FILE_LIMITS,       // Upload size limits
  PAGINATION,        // Default pagination
  ROLES,             // User roles
  SERVICE_DAYS,      // Sunday/Wednesday
  ANALYTICS,         // Analytics config
  CACHE_TTL,         // Cache durations
  BULK_IMPORT,       // Import limits
  EMAIL,             // Email config
  API_MESSAGES,      // Standard messages
} from '@/lib/constants'
```

### Usage Examples
```typescript
// JWT expiry
signToken(payload, { expiresIn: AUTH.JWT_EXPIRY })

// Pagination
const limit = Math.min(query.limit, PAGINATION.MAX_LIMIT)

// Service days
if (date.getDay() === SERVICE_DAYS.SUNDAY) { /* ... */ }

// Cache TTL
headers: { 'Cache-Control': `public, max-age=${CACHE_TTL.BANNERS}` }
```

---

## 📝 TypeScript Types

### Import Types
```typescript
import type {
  User,
  Service,
  Attendance,
  Banner,
  StreamSettings,
  ServiceSettings,
  AnalyticsData,
  TimeseriesDataPoint,
  RhapsodyPayload,
  LoginInput,
  RegisterInput,
  BannerInput,
} from '@/types'
```

### Using Types
```typescript
// API Response
const response: ApiResponse<User> = {
  success: true,
  data: user
}

// Paginated response
const result: PaginatedResponse<User> = {
  data: users,
  pagination: {
    page: 1,
    limit: 50,
    total: 250,
    totalPages: 5
  }
}
```

---

## 🗄️ Database Indexes

### Available Indexes
```sql
-- Users
users_email_idx (email)
users_approved_idx (approved)
users_role_idx (role)
users_createdAt_idx (createdAt)

-- Services
services_date_idx (date)
services_isActive_idx (isActive)

-- Attendance
attendance_userId_idx (userId)
attendance_serviceId_idx (serviceId)
attendance_checkInTime_idx (checkInTime)

-- Banners
banners_active_idx (active)
banners_order_idx (order)

-- ViewerSessions
viewer_sessions_lastSeen_idx (lastSeen)
```

### Query Optimization
```typescript
// Fast queries (uses indexes):
prisma.user.findMany({ where: { approved: true } })     // approved_idx
prisma.user.findUnique({ where: { email: 'test@test.com' } })  // email_idx
prisma.service.findMany({ where: { isActive: true } })  // isActive_idx
prisma.attendance.findMany({ where: { userId: '123' } }) // userId_idx
```

---

## 🛠️ Development Commands

```bash
# Build and check
npm run build          # Build for production
npm run lint           # Run ESLint
npm run dev            # Start dev server

# Database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes
npm run db:setup       # Full setup (generate + push + seed)

# Health check
curl http://localhost:3000/api/health
```

---

## 📚 Documentation Files

1. **APPLICATION_REVIEW_AND_IMPROVEMENTS.md** - Full review and recommendations
2. **REVISED_IMPLEMENTATION_PLAN.md** - Implementation roadmap
3. **IMPLEMENTATION_PROGRESS.md** - Detailed progress tracking
4. **PHASE_1_COMPLETE_SUMMARY.md** - Phase 1 completion summary
5. **QUICK_REFERENCE.md** - This file (quick access guide)

---

## 🎯 Next Steps

### Ready to Use
- ✅ Rate limiting is active on login/register
- ✅ Health check endpoint is live
- ✅ Error classes ready to use
- ✅ Validation schemas ready to integrate
- ✅ Constants available for import
- ✅ Types available for import

### Optional Next Steps
- Apply Zod validation to remaining endpoints
- Add more error handling with custom error classes
- Integrate health check with monitoring service
- Add more constants as needed
- Create additional validation schemas

---

**Last Updated:** October 2024  
**Status:** ✅ Phase 1 Complete - All features ready to use
