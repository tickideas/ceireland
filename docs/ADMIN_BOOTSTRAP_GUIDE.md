# Admin Bootstrap Guide

This guide explains how to set up the initial admin user when deploying to production.

---

## Understanding the User System

Your application has a two-tier user system:

1. **Regular Users** (`role: USER`)
   - Can register themselves via `/register`
   - Start with `approved: false` (pending admin approval)
   - Can access the main dashboard after approval

2. **Admin Users** (`role: ADMIN`)
   - Have full access to `/admin/dashboard`
   - Can manage users, banners, streams, services, etc.
   - Must be manually promoted (no self-registration for security)

---

## Method 1: Register First, Then Promote (Recommended)

This is the safest and most straightforward approach for production.

### Step 1: Deploy Your Application

1. Deploy to Vercel with all environment variables set
2. Ensure `DATABASE_URL` and `JWT_SECRET` are configured
3. Run database migrations:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"

# Apply migrations
npx prisma migrate deploy
```

### Step 2: Register Your Admin Account

1. Visit your production URL: `https://your-app.vercel.app/register`
2. Fill out the registration form with your details:
   - **Email**: Use your actual admin email (e.g., `admin@yourchurch.com`)
   - **Name**: Your name
   - **Phone**: Your contact number
3. Submit the form

You'll see: _"Registration successful. Please wait for admin approval."_

### Step 3: Promote to Admin via Database

Since there's no admin yet to approve you, connect directly to your production database:

#### Option A: Using Database GUI (Recommended)

If using Neon, Supabase, or similar:

1. Open your database provider's SQL editor
2. Run this query (replace with your email):

```sql
UPDATE users 
SET role = 'ADMIN', approved = true 
WHERE email = 'admin@yourchurch.com';
```

3. Verify the update:

```sql
SELECT id, email, name, role, approved 
FROM users 
WHERE email = 'admin@yourchurch.com';
```

#### Option B: Using Dokploy Database Terminal

If using Dokploy with self-hosted PostgreSQL:

1. Open your Dokploy dashboard
2. Navigate to your PostgreSQL service
3. Click "Terminal" or "Console"
4. Connect to your database:

```bash
psql -U postgres -d ceireland
```

5. Run the promotion query:

```sql
UPDATE users 
SET role = 'ADMIN', approved = true 
WHERE email = 'admin@yourchurch.com';
```

6. Verify:

```sql
SELECT id, email, name, role, approved 
FROM users 
WHERE email = 'admin@yourchurch.com';
```

7. Exit: `\q`

#### Option C: Using psql CLI (Remote Connection)

```bash
# Connect to production database
psql "$DATABASE_URL"

# Or if using SSH tunnel to Dokploy
ssh -L 5432:localhost:5432 user@your-dokploy-server
# Then in another terminal:
psql "postgresql://postgres:PASSWORD@localhost:5432/ceireland"

# Promote user
UPDATE users 
SET role = 'ADMIN', approved = true 
WHERE email = 'admin@yourchurch.com';

# Verify
SELECT id, email, name, role, approved 
FROM users 
WHERE email = 'admin@yourchurch.com';

# Exit
\q
```

### Step 4: Login and Verify

1. Go to `https://your-app.vercel.app/login`
2. Enter your email
3. Check your email for the magic link (if SMTP is configured)
4. Click the link to authenticate
5. Navigate to `https://your-app.vercel.app/admin/dashboard`
6. You should see the full admin interface ✅

---

## Method 2: Direct Database Insert

If you prefer to create the admin user directly without using the registration form:

```sql
-- Insert admin user directly
INSERT INTO users (
  id,
  title,
  name,
  "lastName",
  email,
  phone,
  approved,
  role,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,  -- PostgreSQL generates a random ID
  'Pastor',                  -- Optional title
  'John',                    -- Your first name
  'Doe',                     -- Your last name
  'admin@yourchurch.com',    -- Your admin email
  '+1234567890',             -- Your phone (optional)
  true,                      -- Pre-approved
  'ADMIN',                   -- Admin role
  NOW(),
  NOW()
);
```

**Note**: This method bypasses the registration validation, so ensure all required fields are correctly filled.

---

## Method 3: Using Seed Script (Development Only)

The seed script at `prisma/seed.ts` creates a default admin user:

```typescript
await prisma.user.create({
  data: {
    title: 'Pastor',
    name: 'John',
    lastName: 'Doe',
    email: 'admin@church.com',
    phone: '+1234567890',
    approved: true,
    role: 'ADMIN'
  }
})
```

**⚠️ Only use this for local development or staging environments.**

To run the seed:

```bash
export DATABASE_URL="your_database_url"
npm run db:seed
```

For production, use Method 1 or Method 2 instead.

---

## Troubleshooting

### Issue: "Unauthorized" (401) when accessing admin routes

**Cause**: User is not logged in or token is invalid.

**Solution**:
1. Ensure you've logged in via `/login`
2. Check that the `auth-token` cookie is set in your browser
3. Verify `JWT_SECRET` environment variable is set in Vercel

### Issue: "Forbidden" (403) when accessing admin routes

**Cause**: User is logged in but doesn't have admin privileges.

**Solution**:
1. Verify the user's role in the database:
   ```sql
   SELECT email, role, approved FROM users WHERE email = 'your@email.com';
   ```
2. Ensure both `role = 'ADMIN'` and `approved = true`
3. Log out and log back in to refresh the JWT token

### Issue: Magic link email not received

**Cause**: SMTP not configured or misconfigured.

**Solution**:
1. Check Vercel environment variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
2. Verify SMTP credentials with your email provider
3. Check spam/junk folder
4. Temporary workaround: Use database promotion (Method 1, Step 3) to manually approve

### Issue: Cannot connect to production database

**Cause**: Connection string incorrect or SSL not configured.

**Solution**:
1. Verify `DATABASE_URL` includes `?sslmode=require` for production databases
2. Test connection:
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```
3. Check firewall rules allow your IP address

---

## Security Best Practices

1. **Change Default Credentials**: If you used the seed script, immediately update the admin email and details
2. **Use Strong Emails**: Use a dedicated admin email that you control
3. **Limit Admin Accounts**: Only promote trusted users to admin
4. **Audit Admin Actions**: Regularly review admin activity in your database
5. **Rotate JWT Secret**: Periodically rotate `JWT_SECRET` (forces all users to re-login)

---

## Next Steps After Admin Setup

Once you have admin access, configure your application:

1. **Stream Settings** (`/admin/dashboard` → Stream tab)
   - Set `streamUrl` for live streaming
   - Upload poster image

2. **Service Settings** (Service Settings tab)
   - Configure service times
   - Set app name and branding

3. **Banners** (Banners tab)
   - Create promotional banners for the dashboard

4. **User Management** (Users tab)
   - Approve pending user registrations
   - Promote additional admins if needed

5. **Service Schedules** (Schedule tab)
   - Set up recurring service times

---

## Quick Reference

| Task | SQL Command |
|------|-------------|
| Promote user to admin | `UPDATE users SET role='ADMIN', approved=true WHERE email='user@example.com';` |
| Check user status | `SELECT email, role, approved FROM users WHERE email='user@example.com';` |
| List all admins | `SELECT email, name, "lastName" FROM users WHERE role='ADMIN';` |
| Demote admin to user | `UPDATE users SET role='USER' WHERE email='user@example.com';` |
| Approve pending user | `UPDATE users SET approved=true WHERE email='user@example.com';` |

---

## Related Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment instructions
- [OPERATIONS.md](./OPERATIONS.md) - Day-to-day operations and maintenance
- [prisma/schema.prisma](../prisma/schema.prisma) - Database schema reference
- [prisma/seed.ts](../prisma/seed.ts) - Seed script for development

---

**Last Updated**: 2026-01-28
