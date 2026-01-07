package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/todomyday/backend/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	user.ID = uuid.New().String()
	user.Theme = "light"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	_, err := r.db.Exec(`
		INSERT INTO users (id, supabase_id, email, password_hash, full_name, theme, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, user.ID, user.SupabaseID, user.Email, user.PasswordHash, user.FullName, user.Theme, user.CreatedAt, user.UpdatedAt)

	return err
}

func (r *UserRepository) GetByID(id string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, supabase_id, email, password_hash, full_name, theme, created_at, updated_at
		FROM users WHERE id = ?
	`, id).Scan(&user.ID, &user.SupabaseID, &user.Email, &user.PasswordHash, &user.FullName, &user.Theme, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, supabase_id, email, password_hash, full_name, theme, created_at, updated_at
		FROM users WHERE email = ?
	`, email).Scan(&user.ID, &user.SupabaseID, &user.Email, &user.PasswordHash, &user.FullName, &user.Theme, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetBySupabaseID(supabaseID string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, supabase_id, email, password_hash, full_name, theme, created_at, updated_at
		FROM users WHERE supabase_id = ?
	`, supabaseID).Scan(&user.ID, &user.SupabaseID, &user.Email, &user.PasswordHash, &user.FullName, &user.Theme, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) CreateOrUpdateFromSupabase(user *models.User) error {
	if user.SupabaseID == nil {
		return fmt.Errorf("supabase_id is required")
	}

	// Check if user exists by supabase_id
	existing, err := r.GetBySupabaseID(*user.SupabaseID)
	if err != nil {
		return err
	}

	if existing != nil {
		// Update existing user
		updates := map[string]interface{}{
			"email":      user.Email,
			"full_name":  user.FullName,
			"updated_at": time.Now(),
		}
		// Only update password_hash if provided
		if user.PasswordHash != nil {
			updates["password_hash"] = user.PasswordHash
		}
		return r.Update(existing.ID, updates)
	}

	// Check if user exists by email (for migration scenarios)
	existingByEmail, err := r.GetByEmail(user.Email)
	if err != nil {
		return err
	}

	if existingByEmail != nil {
		// Update existing user with supabase_id
		updates := map[string]interface{}{
			"supabase_id": user.SupabaseID,
			"updated_at":  time.Now(),
		}
		if user.FullName != nil {
			updates["full_name"] = user.FullName
		}
		return r.Update(existingByEmail.ID, updates)
	}

	// Create new user
	return r.Create(user)
}

func (r *UserRepository) Update(id string, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()

	query := "UPDATE users SET "
	args := []interface{}{}
	first := true

	for key, value := range updates {
		if !first {
			query += ", "
		}
		query += key + " = ?"
		args = append(args, value)
		first = false
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := r.db.Exec(query, args...)
	return err
}
