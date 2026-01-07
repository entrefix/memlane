package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
)

type SupabaseUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type CreateUserRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	EmailConfirm bool   `json:"email_confirm"`
}

type CreateUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func main() {
	// Load environment variables
	godotenv.Load()
	godotenv.Load("../.env")

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./data/todomyday.db"
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceRoleKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseServiceRoleKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
	}

	// Connect to database
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Run migration to add supabase_id column if it doesn't exist
	if err := runMigration(db); err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}

	// Query existing users
	rows, err := db.Query(`
		SELECT id, email, password_hash 
		FROM users 
		WHERE supabase_id IS NULL AND email IS NOT NULL AND email != ''
	`)
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer rows.Close()

	var users []struct {
		ID           string
		Email        string
		PasswordHash string
	}

	for rows.Next() {
		var user struct {
			ID           string
			Email        string
			PasswordHash string
		}
		if err := rows.Scan(&user.ID, &user.Email, &user.PasswordHash); err != nil {
			log.Printf("Failed to scan user: %v", err)
			continue
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("Error iterating users: %v", err)
	}

	log.Printf("Found %d users to migrate", len(users))

	// Migrate each user
	successCount := 0
	errorCount := 0
	skippedCount := 0

	for _, user := range users {
		log.Printf("Migrating user: %s (%s)", user.Email, user.ID)

		// Check if user already exists in Supabase by email
		existingUser, err := findUserByEmail(supabaseURL, supabaseServiceRoleKey, user.Email)
		if err != nil {
			log.Printf("Error checking for existing user %s: %v", user.Email, err)
			errorCount++
			continue
		}

		var supabaseID string

		if existingUser != nil {
			// User already exists in Supabase, use existing ID
			log.Printf("User %s already exists in Supabase with ID: %s", user.Email, existingUser.ID)
			supabaseID = existingUser.ID
		} else {
			// Create new user in Supabase
			// Note: We can't migrate the password hash directly, so we'll create a user
			// with a temporary password that they'll need to reset
			// In production, you might want to send them a password reset email
			tempPassword := generateTempPassword()

			createdUser, err := createUserInSupabase(supabaseURL, supabaseServiceRoleKey, user.Email, tempPassword)
			if err != nil {
				log.Printf("Failed to create user %s in Supabase: %v", user.Email, err)
				errorCount++
				continue
			}

			supabaseID = createdUser.ID
			log.Printf("Created user %s in Supabase with ID: %s", user.Email, supabaseID)
			log.Printf("NOTE: User %s needs to reset their password using the forgot password flow", user.Email)
		}

		// Update local database with supabase_id
		_, err = db.Exec(`
			UPDATE users 
			SET supabase_id = ?, updated_at = ?
			WHERE id = ?
		`, supabaseID, time.Now(), user.ID)
		if err != nil {
			log.Printf("Failed to update user %s with supabase_id: %v", user.Email, err)
			errorCount++
			continue
		}

		successCount++
		log.Printf("Successfully migrated user: %s", user.Email)
	}

	log.Printf("\nMigration Summary:")
	log.Printf("  Success: %d", successCount)
	log.Printf("  Errors: %d", errorCount)
	log.Printf("  Skipped: %d", skippedCount)
}

func findUserByEmail(supabaseURL, serviceRoleKey, email string) (*SupabaseUser, error) {
	// Supabase Admin API endpoint for getting users
	// The email filter might return a single object or an array depending on the API version
	url := fmt.Sprintf("%s/auth/v1/admin/users", supabaseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")

	// Add email as query parameter
	q := req.URL.Query()
	q.Add("email", email)
	req.URL.RawQuery = q.Encode()

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to find user: %s (status: %d)", string(body), resp.StatusCode)
	}

	// Read the response body to check its structure
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Try to decode as a single user object first
	var singleUser SupabaseUser
	if err := json.Unmarshal(bodyBytes, &singleUser); err == nil && singleUser.ID != "" {
		return &singleUser, nil
	}

	// Try to decode as an array of users
	var users []SupabaseUser
	if err := json.Unmarshal(bodyBytes, &users); err == nil {
		if len(users) > 0 {
			return &users[0], nil
		}
		return nil, nil
	}

	// Try to decode as a paginated response with users array
	var paginatedResponse struct {
		Users []SupabaseUser `json:"users"`
	}
	if err := json.Unmarshal(bodyBytes, &paginatedResponse); err == nil {
		if len(paginatedResponse.Users) > 0 {
			return &paginatedResponse.Users[0], nil
		}
		return nil, nil
	}

	// If all decoding attempts fail, return nil (user not found)
	return nil, nil
}

func createUserInSupabase(supabaseURL, serviceRoleKey, email, password string) (*CreateUserResponse, error) {
	url := fmt.Sprintf("%s/auth/v1/admin/users", supabaseURL)

	reqBody := CreateUserRequest{
		Email:        email,
		Password:     password,
		EmailConfirm: true, // Auto-confirm email for migrated users
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to create user: %s (status: %d)", string(body), resp.StatusCode)
	}

	var user CreateUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func generateTempPassword() string {
	// Generate a random temporary password
	// In production, you might want to use a more secure method
	return fmt.Sprintf("TempPass_%d", time.Now().Unix())
}

func runMigration(db *sql.DB) error {
	// Check if supabase_id column exists
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'supabase_id'
	`).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check for supabase_id column: %w", err)
	}

	if count == 0 {
		log.Println("Adding supabase_id column to users table...")
		// Add supabase_id column
		if _, err := db.Exec(`
			ALTER TABLE users ADD COLUMN supabase_id TEXT;
		`); err != nil {
			return fmt.Errorf("failed to add supabase_id column: %w", err)
		}

		// Create unique index on supabase_id
		if _, err := db.Exec(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_id) WHERE supabase_id IS NOT NULL;
		`); err != nil {
			return fmt.Errorf("failed to create supabase_id index: %w", err)
		}

		log.Println("Migration completed successfully")
	} else {
		log.Println("supabase_id column already exists")
	}

	return nil
}
