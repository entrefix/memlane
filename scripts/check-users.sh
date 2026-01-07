#!/bin/bash

# Helper script to check users in local database

echo "=== Users in Local Database ==="
echo ""

if [ -f "./data/todomyday.db" ]; then
    sqlite3 ./data/todomyday.db <<EOF
.headers on
.mode column
SELECT
    id,
    email,
    supabase_id,
    created_at
FROM users
ORDER BY created_at DESC;
EOF
else
    echo "Database file not found at ./data/todomyday.db"
    echo "Make sure you're in the project root directory"
fi
