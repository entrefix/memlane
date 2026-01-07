package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
)

func main() {
	// Load environment variables
	godotenv.Load()
	godotenv.Load("../.env")

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		// Try Docker volume path first, then fall back to local path
		if _, err := os.Stat("/data/todomyday.db"); err == nil {
			dbPath = "/data/todomyday.db"
		} else {
			dbPath = "./data/todomyday.db"
		}
	}

	log.Printf("Using database path: %s", dbPath)

	// Connect to database
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Query users
	rows, err := db.Query(`
		SELECT id, email, supabase_id, created_at
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer rows.Close()

	fmt.Println("\n=== Users in Database ===\n")
	fmt.Printf("%-36s | %-30s | %-36s | %s\n", "ID", "Email", "Supabase ID", "Created At")
	fmt.Println("-------------------------------------------------------------------------------------------------------------")

	count := 0
	for rows.Next() {
		var id, email, createdAt string
		var supabaseID sql.NullString

		if err := rows.Scan(&id, &email, &supabaseID, &createdAt); err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue
		}

		supabaseIDStr := "NULL"
		if supabaseID.Valid {
			supabaseIDStr = supabaseID.String
		}

		fmt.Printf("%-36s | %-30s | %-36s | %s\n", id, email, supabaseIDStr, createdAt)
		count++
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("Error iterating users: %v", err)
	}

	fmt.Printf("\nTotal users: %d\n", count)

	// Count users with/without supabase_id
	var withSupabase, withoutSupabase int
	err = db.QueryRow(`SELECT COUNT(*) FROM users WHERE supabase_id IS NOT NULL`).Scan(&withSupabase)
	if err != nil {
		log.Printf("Failed to count users with supabase_id: %v", err)
	}
	err = db.QueryRow(`SELECT COUNT(*) FROM users WHERE supabase_id IS NULL`).Scan(&withoutSupabase)
	if err != nil {
		log.Printf("Failed to count users without supabase_id: %v", err)
	}

	fmt.Printf("\nUsers with Supabase ID: %d\n", withSupabase)
	fmt.Printf("Users without Supabase ID: %d (need migration)\n\n", withoutSupabase)
}
