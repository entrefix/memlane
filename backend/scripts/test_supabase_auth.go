package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

type SupabaseClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Exp   int64  `json:"exp"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
}

func main() {
	// Load environment variables
	godotenv.Load()
	godotenv.Load("../.env")

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseAnonKey := os.Getenv("SUPABASE_ANON_KEY")
	jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
	email := os.Getenv("TEST_EMAIL")
	password := os.Getenv("TEST_PASSWORD")

	if supabaseURL == "" {
		log.Fatal("SUPABASE_URL environment variable is required")
	}
	if supabaseAnonKey == "" {
		log.Fatal("SUPABASE_ANON_KEY environment variable is required")
	}
	if jwtSecret == "" {
		log.Fatal("SUPABASE_JWT_SECRET environment variable is required")
	}
	if email == "" {
		email = "aruntemme@gmail.com"
		log.Printf("Using default email: %s", email)
	}
	if password == "" {
		password = "Arun@123"
		log.Printf("Using default password")
	}

	log.Println("=== Supabase Authentication Test ===")
	log.Printf("Supabase URL: %s", supabaseURL)
	log.Printf("JWT Secret length: %d", len(jwtSecret))
	log.Printf("JWT Secret (first 20 chars): %s", jwtSecret[:min(20, len(jwtSecret))])
	log.Println()

	// Step 1: Login with Supabase
	log.Println("Step 1: Logging in with Supabase...")
	loginURL := fmt.Sprintf("%s/auth/v1/token?grant_type=password", supabaseURL)
	
	loginReq := LoginRequest{
		Email:    email,
		Password: password,
	}

	jsonData, err := json.Marshal(loginReq)
	if err != nil {
		log.Fatalf("Failed to marshal login request: %v", err)
	}

	req, err := http.NewRequest("POST", loginURL, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	req.Header.Set("apikey", supabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to make login request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Login failed with status %d: %s", resp.StatusCode, string(body))
	}

	var loginResp LoginResponse
	if err := json.Unmarshal(body, &loginResp); err != nil {
		log.Fatalf("Failed to unmarshal login response: %v", err)
	}

	log.Printf("✓ Login successful!")
	log.Printf("  User ID: %s", loginResp.User.ID)
	log.Printf("  Email: %s", loginResp.User.Email)
	log.Printf("  Access Token (first 50 chars): %s", loginResp.AccessToken[:min(50, len(loginResp.AccessToken))])
	log.Println()

	// Step 2: Parse token without verification
	log.Println("Step 2: Parsing token (unverified)...")
	parser := jwt.NewParser()
	token, _, err := parser.ParseUnverified(loginResp.AccessToken, &SupabaseClaims{})
	if err != nil {
		log.Fatalf("Failed to parse token: %v", err)
	}

	unverifiedClaims, _ := token.Claims.(*SupabaseClaims)
	log.Printf("✓ Token parsed successfully")
	log.Printf("  Algorithm: %v", token.Header["alg"])
	log.Printf("  Type: %v", token.Header["typ"])
	log.Printf("  Sub (User ID): %s", unverifiedClaims.Sub)
	log.Printf("  Email: %s", unverifiedClaims.Email)
	log.Printf("  Exp: %d", unverifiedClaims.Exp)
	log.Printf("  Exp (as time): %s", time.Unix(unverifiedClaims.Exp, 0).Format(time.RFC3339))
	log.Printf("  Now: %s", time.Now().Format(time.RFC3339))
	log.Printf("  Is expired: %v", time.Now().Unix() > unverifiedClaims.Exp)
	log.Println()

	// Step 3: Verify token with JWT secret
	log.Println("Step 3: Verifying token with JWT secret...")
	
	// Try with secret as-is
	log.Println("  Attempting verification with secret as-is...")
	jwtSecretBytes := []byte(jwtSecret)
	token1, err := jwt.ParseWithClaims(loginResp.AccessToken, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
		if alg, ok := token.Header["alg"].(string); !ok || alg != "HS256" {
			return nil, fmt.Errorf("unexpected algorithm: %v", token.Header["alg"])
		}
		return jwtSecretBytes, nil
	})

	if err != nil {
		log.Printf("  ✗ Verification failed: %v", err)
	} else if token1.Valid {
		log.Printf("  ✓ Verification successful with secret as-is!")
		claims, _ := token1.Claims.(*SupabaseClaims)
		log.Printf("    Verified Sub: %s", claims.Sub)
		log.Printf("    Verified Email: %s", claims.Email)
	} else {
		log.Printf("  ✗ Token is not valid")
	}
	log.Println()

	// Try with base64 decoded secret
	log.Println("  Attempting verification with base64-decoded secret...")
	decodedSecret, err := base64.StdEncoding.DecodeString(jwtSecret)
	if err == nil && len(decodedSecret) > 0 {
		token2, err := jwt.ParseWithClaims(loginResp.AccessToken, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
			if alg, ok := token.Header["alg"].(string); !ok || alg != "HS256" {
				return nil, fmt.Errorf("unexpected algorithm: %v", token.Header["alg"])
			}
			return decodedSecret, nil
		})

		if err != nil {
			log.Printf("  ✗ Verification failed with base64-decoded: %v", err)
		} else if token2.Valid {
			log.Printf("  ✓ Verification successful with base64-decoded secret!")
			claims, _ := token2.Claims.(*SupabaseClaims)
			log.Printf("    Verified Sub: %s", claims.Sub)
			log.Printf("    Verified Email: %s", claims.Email)
		} else {
			log.Printf("  ✗ Token is not valid with base64-decoded secret")
		}
	} else {
		log.Printf("  (Skipping - secret is not valid base64)")
	}
	log.Println()

	// Step 4: Test with backend API
	log.Println("Step 4: Testing with backend API...")
	backendURL := os.Getenv("API_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8099"
	}

	testURL := fmt.Sprintf("%s/api/auth/me", backendURL)
	req2, err := http.NewRequest("GET", testURL, nil)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	req2.Header.Set("Authorization", fmt.Sprintf("Bearer %s", loginResp.AccessToken))
	req2.Header.Set("Content-Type", "application/json")

	resp2, err := client.Do(req2)
	if err != nil {
		log.Printf("  ✗ Request failed: %v", err)
	} else {
		defer resp2.Body.Close()
		body2, _ := io.ReadAll(resp2.Body)
		if resp2.StatusCode == http.StatusOK {
			log.Printf("  ✓ Backend API accepted the token!")
			log.Printf("    Response: %s", string(body2))
		} else {
			log.Printf("  ✗ Backend API rejected the token (status %d)", resp2.StatusCode)
			log.Printf("    Response: %s", string(body2))
		}
	}

	log.Println()
	log.Println("=== Test Complete ===")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

