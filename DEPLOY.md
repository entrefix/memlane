# Deployment Guide

Step-by-step guide to deploy the application on a production server.

## On Your Production Server

### 1. Pull Latest Changes

```bash
cd ~/mrbrain
git pull origin main
```

### 2. Rebuild and Restart

```bash
sudo docker compose down
sudo docker compose up --build -d
```

Wait for the build to complete (usually 2-5 minutes).

### 3. Verify Services are Running

```bash
sudo docker compose ps
```

You should see both `backend` and `frontend` services running.

### 4. Check Backend Logs

```bash
sudo docker compose logs backend | tail -30
```

Look for:
- ✅ "Server listening on :8099"
- ✅ No database migration errors
- ✅ No "SUPABASE_" environment variable errors

### 5. Check Users in Database

```bash
sudo docker compose exec backend ./check-users
```

This will show:
- All users in the database
- Which users have `supabase_id` (migrated)
- Which users need migration

### 6. Run User Migration (First Time Only)

**⚠️ Only run this if users don't have `supabase_id`!**

Get your Supabase service role key:
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Settings** → **API** → **Project API keys**
4. Copy the **service_role** key (keep it secret!)

Run the migration:
```bash
sudo docker compose exec -e SUPABASE_SERVICE_ROLE_KEY=your-key-here backend ./migrate-users
```

Example:
```bash
sudo docker compose exec -e SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... backend ./migrate-users
```

### 7. Verify Migration

Check users again:
```bash
sudo docker compose exec backend ./check-users
```

All users should now have a `supabase_id`.

Check Supabase Dashboard:
- https://supabase.com/dashboard
- Your Project → **Authentication** → **Users**
- You should see all migrated users

### 8. Fix Email Verification URLs

**This is critical for production!**

In Supabase Dashboard:
1. Go to: **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://your-actual-domain.com`
3. Set **Redirect URLs** (click "Add URL" for each):
   - `https://your-actual-domain.com/auth/callback`
   - `https://your-actual-domain.com/reset-password`

Save changes.

### 9. Test the Application

1. Open your production URL in a browser
2. Try to register a new account
3. Check email for verification link
4. Click the link - should redirect to your domain (not localhost)
5. Try logging in

### 10. Notify Existing Users

If you migrated existing users, send them an email:

```
Subject: Password Reset Required

Hi,

We've upgraded our authentication system to provide better security.

Please reset your password:
1. Go to https://your-domain.com/forgot-password
2. Enter your email address
3. Check your email for the reset link
4. Set your new password

Thanks!
```

## Troubleshooting

### Backend Won't Start

```bash
sudo docker compose logs backend
```

Common issues:
- Missing `SUPABASE_JWT_SECRET` in `.env`
- Database permission issues
- Port 8099 already in use

### Migration Fails

```bash
# Check if database is accessible
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT COUNT(*) FROM users;"

# Check environment variables
sudo docker compose exec backend env | grep SUPABASE
```

### Email Links Point to Localhost

This is fixed in Supabase Dashboard (step 8 above).

## Rolling Back

If something goes wrong:

```bash
# Stop services
sudo docker compose down

# Restore database backup (if you made one)
sudo docker compose cp ~/backups/backup.db backend:/data/todomyday.db

# Start with previous version
git checkout <previous-commit-hash>
sudo docker compose up --build -d
```

## Monitoring

### Check Backend Health

```bash
curl http://localhost:8099/health
```

### View Real-Time Logs

```bash
# Backend logs
sudo docker compose logs -f backend

# All logs
sudo docker compose logs -f
```

### Check Disk Space

```bash
df -h
du -sh ~/mrbrain/data
```

## Maintenance

### Weekly Backup

```bash
# Backup database
sudo docker compose exec backend sqlite3 /data/todomyday.db ".backup /data/backup-$(date +%Y%m%d).db"

# Copy to safe location
sudo docker compose cp backend:/data/backup-$(date +%Y%m%d).db ~/backups/
```

### Clean Up Docker

```bash
# Remove old images (saves disk space)
sudo docker image prune -a

# Remove unused volumes (⚠️ careful!)
sudo docker volume prune
```

## Getting Help

If you run into issues:

1. Check logs: `sudo docker compose logs backend`
2. Check database: `sudo docker compose exec backend ./check-users`
3. Check the [PRODUCTION_COMMANDS.md](PRODUCTION_COMMANDS.md) guide
4. Check [SECURITY.md](SECURITY.md) for security best practices

## Next Steps

After successful deployment:

1. ✅ Set up SSL/HTTPS (use Nginx or Caddy)
2. ✅ Configure domain DNS
3. ✅ Set up automated backups
4. ✅ Configure monitoring (uptime checks)
5. ✅ Set up log rotation
6. ✅ Review [SECURITY.md](SECURITY.md) for production hardening
