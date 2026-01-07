# Production Server Commands

Quick reference for managing the application on production servers.

## Quick Command Reference

```bash
# Check users in database
sudo docker compose exec backend ./check-users

# Query database
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT * FROM users;"

# Run user migration (one-time only)
sudo docker compose exec -e SUPABASE_SERVICE_ROLE_KEY=your-key backend ./migrate-users

# View backend logs
sudo docker compose logs -f backend

# Restart services
sudo docker compose restart

# Rebuild and deploy
sudo docker compose up --build -d
```

## Prerequisites

On your production server, ensure you have:
- Docker and Docker Compose installed
- `.env` file in the project root with all required variables

## Deployment

### Initial Deployment

```bash
# Clone repository
git clone <your-repo-url> ~/mrbrain
cd ~/mrbrain

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your production values

# Build and start
sudo docker compose up --build -d
```

### Update Deployment

```bash
cd ~/mrbrain

# Pull latest changes
git pull

# Rebuild and restart
sudo docker compose up --build -d

# Or rebuild only specific service
sudo docker compose up --build -d backend
sudo docker compose up --build -d frontend
```

## Database Management

### Check Users in Database

After rebuild (with sqlite3 installed):
```bash
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT id, email, supabase_id, created_at FROM users;"
```

Or use the query script:
```bash
sudo docker compose exec backend /app/scripts/db-query.sh "SELECT id, email, supabase_id FROM users;"
```

### Check Specific User

```bash
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT * FROM users WHERE email='user@example.com';"
```

### Count Users

```bash
# Total users
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT COUNT(*) FROM users;"

# Users with Supabase ID
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT COUNT(*) FROM users WHERE supabase_id IS NOT NULL;"

# Users without Supabase ID (need migration)
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT COUNT(*) FROM users WHERE supabase_id IS NULL;"
```

## User Migration to Supabase

**⚠️ WARNING: Only run this ONCE after switching to Supabase authentication!**

### Step 1: Check Current Users

```bash
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT id, email, supabase_id FROM users;"
```

### Step 2: Get Service Role Key

1. Go to Supabase Dashboard → Your Project
2. Navigate to: Settings → API → Project API keys
3. Copy the **service_role** secret key

**⚠️ IMPORTANT: This key grants admin access. Never commit it to git!**

### Step 3: Run Migration

```bash
# Replace YOUR_SERVICE_ROLE_KEY with the actual key
sudo docker compose exec -e SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY backend ./migrate-users
```

Example:
```bash
sudo docker compose exec -e SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... backend ./migrate-users
```

### Step 4: Verify Migration

Check users now have Supabase IDs:
```bash
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT email, supabase_id FROM users;"
```

Check Supabase Dashboard:
- Go to: Authentication → Users
- You should see all migrated users

### Step 5: Notify Users

Users will need to reset their passwords:
1. Go to your app's login page
2. Click "Forgot Password"
3. Enter their email
4. Follow the reset link in their email

## Container Management

### View Logs

```bash
# All services
sudo docker compose logs

# Specific service with tail
sudo docker compose logs -f backend
sudo docker compose logs -f frontend

# Last 50 lines
sudo docker compose logs --tail=50 backend
```

### Restart Services

```bash
# All services
sudo docker compose restart

# Specific service
sudo docker compose restart backend
sudo docker compose restart frontend
```

### Stop Services

```bash
# Stop all
sudo docker compose stop

# Stop specific service
sudo docker compose stop backend
```

### Remove and Rebuild

```bash
# Remove containers and rebuild
sudo docker compose down
sudo docker compose up --build -d

# Remove containers, volumes, and rebuild (⚠️ deletes database!)
sudo docker compose down -v
sudo docker compose up --build -d
```

## Backup & Restore

### Backup Database

```bash
# Create backup
sudo docker compose exec backend sqlite3 /data/todomyday.db ".backup /data/backup-$(date +%Y%m%d).db"

# Copy to host
sudo docker compose cp backend:/data/backup-$(date +%Y%m%d).db ~/backups/
```

### Restore Database

```bash
# Copy backup to container
sudo docker compose cp ~/backups/backup-20260107.db backend:/data/restore.db

# Restore
sudo docker compose exec backend sh -c "sqlite3 /data/todomyday.db < /data/restore.db"

# Restart backend
sudo docker compose restart backend
```

## Troubleshooting

### Backend Won't Start

Check logs:
```bash
sudo docker compose logs backend
```

Common issues:
- Missing environment variables
- Database permission issues
- Port 8099 already in use

### Frontend Shows White Screen

```bash
# Check frontend logs
sudo docker compose logs frontend

# Rebuild frontend
sudo docker compose up --build -d frontend
```

### Database Locked

```bash
# Stop all services
sudo docker compose stop

# Check for .db-wal and .db-shm files
ls -la ./data/

# Remove WAL files (⚠️ only if database is not in use)
sudo rm ./data/todomyday.db-wal ./data/todomyday.db-shm

# Restart
sudo docker compose up -d
```

### Supabase Authentication Issues

1. **Check environment variables:**
   ```bash
   sudo docker compose exec backend env | grep SUPABASE
   ```

2. **Verify JWT secret matches Supabase:**
   - Supabase Dashboard → Settings → API → JWT Secret
   - Should match `SUPABASE_JWT_SECRET` in your `.env`

3. **Check URL configuration in Supabase:**
   - Authentication → URL Configuration
   - Site URL should be your production domain
   - Redirect URLs should include your auth callback

### Email Verification Links Point to Localhost

Fix in Supabase Dashboard:
- Authentication → URL Configuration
- Set Site URL to: `https://your-production-domain.com`
- Add to Redirect URLs: `https://your-production-domain.com/auth/callback`

## Health Checks

### Check if Services are Running

```bash
sudo docker compose ps
```

### Check Backend Health

```bash
curl http://localhost:8099/health
# or
curl http://your-domain.com/api/health
```

### Check Database Connection

```bash
sudo docker compose exec backend sqlite3 /data/todomyday.db "SELECT 1;"
```

## Security

### Update Environment Variables

```bash
cd ~/mrbrain
nano .env

# After changes, restart services
sudo docker compose restart
```

### View Environment (Debug Only)

```bash
# ⚠️ Contains secrets - only use for debugging
sudo docker compose exec backend env
```

### Rotate Secrets

If secrets are compromised:
1. Generate new keys in Supabase Dashboard
2. Update `.env` file
3. Restart: `sudo docker compose restart backend`
4. For Supabase JWT secret change: All users need to re-login

## Monitoring

### Disk Usage

```bash
# Check Docker disk usage
sudo docker system df

# Check data directory
du -sh ./data
```

### Container Resource Usage

```bash
sudo docker stats
```

### Clean Up Old Images

```bash
# Remove unused images
sudo docker image prune -a

# Remove unused volumes (⚠️ careful!)
sudo docker volume prune
```
