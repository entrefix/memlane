#!/bin/sh
# Simple database query script for Docker containers
# Usage: ./db-query.sh "SELECT * FROM users;"

DB_PATH="${DATABASE_PATH:-/data/todomyday.db}"

if [ -z "$1" ]; then
    echo "Usage: $0 \"SQL_QUERY\""
    echo "Example: $0 \"SELECT id, email FROM users;\""
    exit 1
fi

if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

sqlite3 "$DB_PATH" "$1"
