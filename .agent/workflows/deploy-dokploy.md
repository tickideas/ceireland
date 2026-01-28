---
description: Deploy to Dokploy with PostgreSQL
---

# Deploy to Dokploy

This workflow guides you through deploying the ZChurch application to Dokploy with a self-hosted PostgreSQL database.

## Prerequisites

- Dokploy instance running and accessible
- Git repository pushed to GitHub/GitLab
- Domain name (optional but recommended)

---

## Step 1: Create PostgreSQL Database

1. **Login to Dokploy dashboard**
2. **Create or select project** (e.g., "ZChurch")
3. **Add PostgreSQL service**:
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Name: `zchurch-db`
   - Database: `zchurch`
   - Username: `postgres`
   - Password: Generate strong password (save it!)
   - Port: `5432`
4. **Deploy database** and wait for "Running" status
5. **Note internal connection string**: `postgresql://postgres:PASSWORD@zchurch-db:5432/zchurch`

---

## Step 2: Configure Environment Variables

In Dokploy project settings, add these environment variables:

**Required:**
```
DATABASE_URL=postgresql://postgres:PASSWORD@zchurch-db:5432/zchurch
JWT_SECRET=<run: openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

**SMTP (for magic link emails):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourchurch.com
```

**Optional:**
```
RHAPSODY_BASE_URL=<custom-url>
RHAPSODY_LANG=en
```

---

## Step 3: Deploy Application

1. **Add application service**:
   - Click "Add Service" → "Application"
   - Source: "Git Repository"
   - Repository URL: `https://github.com/your-username/your-repo.git`
   - Branch: `main`
   - Build method: **Nixpacks** (auto-detects Next.js)

2. **Configure build**:
   - Build command: `npm run build` (auto-detected)
   - Start command: `npm start` (auto-detected)
   - Port: `3000`

3. **Add environment variables** from Step 2

4. **Click "Deploy"** and monitor build logs

---

## Step 4: Run Database Migrations

// turbo
After successful deployment, initialize the database schema:

1. **Open application terminal** in Dokploy
2. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

---

## Step 5: Set Up Admin User

### Option A: Register and Promote (Recommended)

1. **Visit your app**: `https://your-domain.com/register`
2. **Register with your admin email**
3. **Access database terminal** in Dokploy (PostgreSQL service)
4. **Connect to database**:
   ```bash
   psql -U postgres -d zchurch
   ```
5. **Promote to admin**:
   ```sql
   UPDATE users SET role = 'ADMIN', approved = true WHERE email = 'your-admin@email.com';
   ```
6. **Verify**:
   ```sql
   SELECT email, role, approved FROM users WHERE email = 'your-admin@email.com';
   ```
7. **Exit**: `\q`
8. **Login** and access `/admin/dashboard`

### Option B: Use Seed Script (Development/Staging Only)

```bash
# In application terminal
npm run db:seed
```

This creates default admin: `admin@church.com`

---

## Step 6: Configure Domain and SSL

1. **In application settings**, go to "Domains" tab
2. **Add domain**: `church.yourdomain.com`
3. **Update DNS**: Add A record pointing to Dokploy server IP
4. **Wait for SSL**: Dokploy auto-provisions Let's Encrypt (1-2 min)
5. **Update env var**: Set `NEXT_PUBLIC_APP_URL` to your domain
6. **Redeploy** application

---

## Step 7: Verify Deployment

**Check these endpoints:**

- ✅ Homepage: `https://your-domain.com`
- ✅ Registration: `https://your-domain.com/register`
- ✅ Login: `https://your-domain.com/login`
- ✅ Admin: `https://your-domain.com/admin/dashboard`

---

## Troubleshooting

### Build fails with Prisma errors

**Solution**: Ensure `postinstall` script in `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Database connection refused

**Solution**: 
- Verify `DATABASE_URL` uses internal service name: `zchurch-db`
- Ensure both services in same Dokploy project
- Check database is running

### 502 Bad Gateway

**Solution**:
- Verify app listens on port `3000`
- Check application logs in Dokploy
- Ensure `PORT=3000` environment variable

---

## Updating Deployment

1. **Push changes to git**:
   ```bash
   git push origin main
   ```

2. **Redeploy** in Dokploy (auto-deploy or manual trigger)

3. **Run new migrations** (if schema changed):
   ```bash
   npx prisma migrate deploy
   ```

---

## Related Documentation

- [DOKPLOY_DEPLOYMENT.md](../docs/DOKPLOY_DEPLOYMENT.md) - Full Dokploy guide
- [ADMIN_BOOTSTRAP_GUIDE.md](../docs/ADMIN_BOOTSTRAP_GUIDE.md) - Admin setup details
- [DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md) - General deployment guide

---

**For detailed instructions, see [docs/DOKPLOY_DEPLOYMENT.md](../docs/DOKPLOY_DEPLOYMENT.md)**
