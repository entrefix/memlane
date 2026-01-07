#!/bin/bash

# Helper script to migrate users to Supabase
# Usage: ./scripts/migrate-users.sh <service-role-key>

if [ -z "$1" ]; then
    echo "Error: Service role key required"
    echo "Usage: ./scripts/migrate-users.sh <service-role-key>"
    echo ""
    echo "Get your service role key from:"
    echo "Supabase Dashboard > Settings > API > Project API keys > service_role secret"
    echo ""
    echo "⚠️  WARNING: This key grants admin access. Use only for this migration, then delete it."
    exit 1
fi

SERVICE_ROLE_KEY=$1

echo "=== Migrating Users to Supabase ==="
echo ""
echo "This will:"
echo "1. Create Supabase accounts for existing users"
echo "2. Link local users to Supabase via supabase_id"
echo "3. Users will need to reset passwords via 'Forgot Password'"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

cd backend

# Run migration with temporary service role key
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY go run scripts/migrate_users_to_supabase.go

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Next steps:"
echo "1. Users need to use 'Forgot Password' to set new passwords"
echo "2. Verify users in Supabase Dashboard > Authentication > Users"
echo "3. Check local database: ./scripts/check-users.sh"
