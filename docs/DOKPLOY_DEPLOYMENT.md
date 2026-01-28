# Dokploy Deployment Guide

Complete guide for deploying the Christ Embassy Ireland application to Dokploy with self-hosted PostgreSQL.

---

## Overview

**Dokploy** is a self-hosted PaaS (Platform as a Service) that simplifies application deployment. This guide covers deploying your Next.js application with a PostgreSQL database on Dokploy.

**Stack:**
- **Application**: Next.js (deployed as Docker container or Nixpacks)
- **Database**: Self-hosted PostgreSQL (Dokploy managed)
- **Platform**: Dokploy

---

## Prerequisites

- Dokploy instance running and accessible
- Git repository with your application code
- Domain name (optional but recommended)

---

## Step 1: Set Up PostgreSQL Database

### Create Database Service

1. **Navigate to your Dokploy dashboard**
2. **Create a new Project** (if you haven't already)
   - Click "New Project"
   - Name it (e.g., "Christ Embassy Ireland")

3. **Add PostgreSQL Database**
   - Inside your project, click "Add Service" → "Database" → "PostgreSQL"
   - Configure:
     - **Name**: `ceireland-db` (or your preferred name)
     - **PostgreSQL Version**: 16 or latest stable
     - **Database Name**: `ceireland`
     - **Username**: `postgres` (default) or custom
     - **Password**: Generate a strong password (save this!)
     - **Port**: `5432` (default)

4. **Deploy the database**
   - Click "Deploy"
   - Wait for the database to be ready (status: Running)

5. **Note the connection details**
   - Internal URL: `postgres://postgres:PASSWORD@ceireland-db:5432/ceireland`
   - External URL (if exposed): `postgres://postgres:PASSWORD@your-server-ip:5432/ceireland`


   

---

## Step 2: Configure Application Environment Variables

In your Dokploy project, set up environment variables for your Next.js application:

### Required Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@ceireland-db:5432/ceireland` | Use internal service name |
| `JWT_SECRET` | `<generate-random-string>` | Use `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Your public URL |
| `SMTP_HOST` | `smtp.gmail.com` | Your SMTP server |
| `SMTP_PORT` | `587` | Usually 587 or 465 |
| `SMTP_USER` | `your-email@gmail.com` | SMTP username |
| `SMTP_PASS` | `your-app-password` | SMTP password |
| `SMTP_FROM` | `noreply@yourchurch.com` | From email address |
| `NODE_ENV` | `production` | Production mode |

### Optional Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `RHAPSODY_BASE_URL` | Custom URL | Override devotional source |
| `RHAPSODY_LANG` | `en` | Devotional language |

### Setting Variables in Dokploy

1. Go to your application service settings
2. Navigate to "Environment Variables" tab
3. Add each variable:
   - Click "Add Variable"
   - Enter **Key** and **Value**
   - Click "Save"

**Pro Tip**: Use Dokploy's project-level or environment-level variables for shared values:
- Project-level: `${{project.JWT_SECRET}}`
- Environment-level: `${{environment.DATABASE_PASSWORD}}`

---

## Step 3: Deploy Next.js Application

### Option A: Deploy from Git Repository (Recommended)

1. **Create Application Service**
   - In your project, click "Add Service" → "Application"
   - Choose "Git Repository"

2. **Configure Git Source**
   - **Repository URL**: `https://github.com/your-username/your-repo.git`
   - **Branch**: `main` (or your production branch)
   - **Build Method**: Choose one:
     - **Nixpacks** (auto-detects Next.js, easier)
     - **Dockerfile** (if you have a custom Dockerfile)

3. **Configure Build Settings**
   - **Build Command**: `npm run build` (auto-detected)
   - **Start Command**: `npm start` (auto-detected)
   - **Port**: `3000` (Next.js default)

4. **Add Environment Variables**
   - Add all variables from Step 2

5. **Deploy**
   - Click "Deploy"
   - Monitor build logs for any errors

### Option B: Deploy with Dockerfile

If using a custom Dockerfile, ensure environment variables are accessible during build:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Make build-time env vars available
ARG DATABASE_URL
ARG NEXT_PUBLIC_APP_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

---

## Step 4: Run Database Migrations

After deploying the application, you need to initialize the database schema.

### Method 1: Using Dokploy Terminal (Recommended)

1. **Access Application Terminal**
   - In Dokploy, go to your application service
   - Click "Terminal" or "Console"

2. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Verify**
   ```bash
   npx prisma db pull
   ```

### Method 2: Using Local Terminal with Remote Database

1. **Get Database Connection String**
   - If your database is exposed externally, use the external URL
   - Otherwise, use SSH tunnel to Dokploy server

2. **Run Migrations Locally**
   ```bash
   export DATABASE_URL="postgresql://postgres:PASSWORD@your-server-ip:5432/ceireland"
   npx prisma migrate deploy
   ```

### Method 3: SSH Tunnel (If Database Not Exposed)

```bash
# Create SSH tunnel
ssh -L 5432:localhost:5432 user@your-dokploy-server

# In another terminal
export DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/ceireland"
npx prisma migrate deploy
```

---

## Step 5: Seed Database (Optional)

To populate initial data:

```bash
# Via Dokploy terminal
npm run db:seed

# Or locally with tunnel
export DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/ceireland"
npm run db:seed
```

**Note**: The seed creates a default admin user (`admin@church.com`). For production, follow the [Admin Bootstrap Guide](./ADMIN_BOOTSTRAP_GUIDE.md) to create your real admin user.

---

## Step 6: Set Up Initial Admin User

Follow the **[Admin Bootstrap Guide](./ADMIN_BOOTSTRAP_GUIDE.md)** to create your first admin user.

**Quick Steps:**

1. **Register** via your application's `/register` page
2. **Connect to PostgreSQL** (via Dokploy terminal or SSH tunnel)
3. **Promote to admin**:
   ```sql
   UPDATE users 
   SET role = 'ADMIN', approved = true 
   WHERE email = 'your-admin@email.com';
   ```
4. **Login** and access `/admin/dashboard`

### Connecting to PostgreSQL from Dokploy

**Option A: Using Dokploy Database Terminal**
1. Go to your PostgreSQL service in Dokploy
2. Click "Terminal" or "Console"
3. Run: `psql -U postgres -d ceireland`
4. Execute SQL commands

**Option B: Using External Client**
1. Expose PostgreSQL port in Dokploy (if not already)
2. Use any PostgreSQL client (pgAdmin, DBeaver, psql)
3. Connect using external URL

---

## Step 7: Configure Domain and SSL

### Add Custom Domain

1. **In Dokploy Application Settings**
   - Go to "Domains" tab
   - Click "Add Domain"
   - Enter your domain: `church.yourdomain.com`

2. **Configure DNS**
   - Add A record pointing to your Dokploy server IP
   - Or CNAME if using a subdomain

3. **Enable SSL**
   - Dokploy automatically provisions Let's Encrypt SSL
   - Wait for certificate generation (1-2 minutes)

4. **Update Environment Variable**
   - Update `NEXT_PUBLIC_APP_URL` to your domain
   - Redeploy application

---

## Step 8: Verify Deployment

### Health Checks

1. **Application Running**
   ```bash
   curl https://your-domain.com
   # Should return HTML
   ```

2. **Database Connected**
   ```bash
   curl https://your-domain.com/api/health
   # Should return 200 OK
   ```

3. **Authentication Working**
   - Visit `/register` and create test account
   - Check email for magic link
   - Login successfully

4. **Admin Access**
   - Login with admin account
   - Visit `/admin/dashboard`
   - Should see admin interface

---

## Troubleshooting

### Issue: Build Fails with "Cannot find module '@prisma/client'"

**Cause**: Prisma Client not generated during build.

**Solution**: Ensure build process includes:
```bash
npx prisma generate
npm run build
```

Or add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

### Issue: Database Connection Refused

**Cause**: Application can't reach database.

**Solution**:
1. Verify `DATABASE_URL` uses internal service name: `ceireland-db`
2. Ensure both services are in the same Dokploy project
3. Check database service is running
4. Verify credentials are correct

### Issue: Environment Variables Not Available During Build

**Cause**: Dokploy environment variables are runtime-only by default.

**Solution**: 
- For Nixpacks: Variables are automatically available
- For Dockerfile: Use `ARG` and `ENV` (see Dockerfile example above)

### Issue: Migration Fails with "Permission Denied"

**Cause**: Database user lacks permissions.

**Solution**:
```sql
GRANT ALL PRIVILEGES ON DATABASE ceireland TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

### Issue: 502 Bad Gateway

**Cause**: Application not listening on correct port.

**Solution**:
1. Ensure application listens on `0.0.0.0:3000`
2. Verify `PORT` environment variable is set to `3000`
3. Check application logs in Dokploy

---

## Maintenance and Updates

### Deploying Updates

1. **Push to Git Repository**
   ```bash
   git push origin main
   ```

2. **Trigger Redeploy in Dokploy**
   - Dokploy can auto-deploy on git push (configure webhooks)
   - Or manually click "Redeploy" in Dokploy UI

3. **Run New Migrations (if any)**
   ```bash
   # Via Dokploy terminal
   npx prisma migrate deploy
   ```

### Database Backups

**Automated Backups** (Recommended):
1. In Dokploy PostgreSQL service settings
2. Enable "Automatic Backups"
3. Set schedule (e.g., daily at 2 AM)

**Manual Backup**:
```bash
# Via Dokploy terminal
pg_dump -U postgres ceireland > backup_$(date +%Y%m%d).sql

# Or via SSH
ssh user@dokploy-server "docker exec ceireland-db pg_dump -U postgres ceireland" > backup.sql
```

**Restore Backup**:
```bash
# Via Dokploy terminal
psql -U postgres ceireland < backup.sql
```

### Monitoring

1. **Application Logs**
   - Dokploy UI → Application → "Logs" tab
   - Real-time log streaming

2. **Database Logs**
   - Dokploy UI → PostgreSQL Service → "Logs" tab

3. **Resource Usage**
   - Monitor CPU, Memory, Disk in Dokploy dashboard
   - Set up alerts if available

---

## Performance Optimization

### Enable Connection Pooling

For better database performance, consider using PgBouncer:

1. **Add PgBouncer Service** in Dokploy
2. **Update DATABASE_URL** to point to PgBouncer
3. **Configure pool settings**:
   - Max connections: 20-50
   - Pool mode: Transaction

### Enable Caching

Consider adding Redis for session/data caching:

1. **Add Redis Service** in Dokploy
2. **Update application** to use Redis for caching
3. **Configure cache strategy** for API routes

---

## Security Checklist

- ✅ Strong `JWT_SECRET` (32+ characters)
- ✅ Database password is strong and unique
- ✅ PostgreSQL not exposed publicly (use internal networking)
- ✅ SSL/HTTPS enabled for application
- ✅ Environment variables not committed to git
- ✅ Regular database backups enabled
- ✅ SMTP credentials secured
- ✅ Admin users limited and audited

---

## Quick Reference

### Dokploy Service Names
- **Application**: `ceireland-app` (or your chosen name)
- **Database**: `ceireland-db` (or your chosen name)

### Connection Strings
- **Internal**: `postgresql://postgres:PASSWORD@ceireland-db:5432/ceireland`
- **External**: `postgresql://postgres:PASSWORD@SERVER_IP:5432/ceireland`

### Common Commands
```bash
# Run migrations
npx prisma migrate deploy

# Seed database
npm run db:seed

# Generate Prisma Client
npx prisma generate

# Access database
psql -U postgres -d ceireland

# View logs
docker logs -f <container-name>
```

---

## Related Documentation

- [ADMIN_BOOTSTRAP_GUIDE.md](./ADMIN_BOOTSTRAP_GUIDE.md) - Setting up admin users
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - General deployment guide
- [OPERATIONS.md](./OPERATIONS.md) - Day-to-day operations
- [Dokploy Documentation](https://dokploy.com/docs)

---

**Last Updated**: 2026-01-28
