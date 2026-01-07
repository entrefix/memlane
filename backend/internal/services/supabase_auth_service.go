package services

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/todomyday/backend/internal/models"
	"github.com/todomyday/backend/internal/repository"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrTokenExpired = errors.New("token has expired")
)

type SupabaseClaims struct {
	Sub   string `json:"sub"` // Supabase user ID (UUID)
	Email string `json:"email"`
	Exp   int64  `json:"exp"`
	jwt.RegisteredClaims
}

type SupabaseAuthService struct {
	userRepo        *repository.UserRepository
	jwtSecret       []byte
	jwtSecretString string // Keep original for ES256 key extraction
	supabaseURL     string
	anonKey         string // For verifying user tokens
	serviceRoleKey  string
	publicKey       *ecdsa.PublicKey // For ES256 verification
}

func NewSupabaseAuthService(
	userRepo *repository.UserRepository,
	jwtSecret string,
	supabaseURL string,
	anonKey string,
	serviceRoleKey string,
) *SupabaseAuthService {
	// Try to decode as base64 first, if that fails, use as-is
	secretBytes := []byte(jwtSecret)
	if decoded, err := base64.StdEncoding.DecodeString(jwtSecret); err == nil && len(decoded) > 0 {
		secretBytes = decoded
		fmt.Println("DEBUG: Using base64-decoded JWT secret")
	} else {
		fmt.Println("DEBUG: Using JWT secret as-is (not base64)")
	}

	// Try to extract public key from JWT secret for ES256
	// Supabase JWT secret is typically a private key in PEM or base64 format
	var publicKey *ecdsa.PublicKey
	publicKey = extractPublicKeyFromSecret(jwtSecret)
	if publicKey == nil {
		// Try with base64 decoded
		publicKey = extractPublicKeyFromSecret(string(secretBytes))
	}
	// If still no public key, try parsing the secret as a raw private key
	if publicKey == nil {
		publicKey = extractPublicKeyFromRawSecret(jwtSecret, secretBytes)
	}

	service := &SupabaseAuthService{
		userRepo:        userRepo,
		jwtSecret:       secretBytes,
		jwtSecretString: jwtSecret,
		supabaseURL:     supabaseURL,
		anonKey:         anonKey,
		serviceRoleKey:  serviceRoleKey,
		publicKey:       publicKey,
	}

	if publicKey != nil {
		fmt.Println("DEBUG: Extracted ECDSA public key for ES256 verification")
	} else {
		fmt.Println("DEBUG: Could not extract public key from secret, will try JWKS endpoint on first token")
	}

	return service
}

// extractPublicKeyFromSecret tries to extract an ECDSA public key from the JWT secret
func extractPublicKeyFromSecret(secret string) *ecdsa.PublicKey {
	// Try parsing as PEM
	block, _ := pem.Decode([]byte(secret))
	if block != nil {
		if key, err := x509.ParseECPrivateKey(block.Bytes); err == nil {
			return &key.PublicKey
		}
		if key, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
			if ecdsaKey, ok := key.(*ecdsa.PrivateKey); ok {
				return &ecdsaKey.PublicKey
			}
		}
	}

	// Try parsing as base64-encoded DER
	if decoded, err := base64.StdEncoding.DecodeString(secret); err == nil {
		if key, err := x509.ParseECPrivateKey(decoded); err == nil {
			return &key.PublicKey
		}
		if key, err := x509.ParsePKCS8PrivateKey(decoded); err == nil {
			if ecdsaKey, ok := key.(*ecdsa.PrivateKey); ok {
				return &ecdsaKey.PublicKey
			}
		}
	}

	return nil
}

// extractPublicKeyFromRawSecret tries to parse the secret as a raw private key
func extractPublicKeyFromRawSecret(secret string, secretBytes []byte) *ecdsa.PublicKey {
	// Try parsing as raw bytes (might be DER encoded)
	if key, err := x509.ParseECPrivateKey(secretBytes); err == nil {
		return &key.PublicKey
	}
	if key, err := x509.ParsePKCS8PrivateKey(secretBytes); err == nil {
		if ecdsaKey, ok := key.(*ecdsa.PrivateKey); ok {
			return &ecdsaKey.PublicKey
		}
	}

	// Try parsing the original string as DER
	if key, err := x509.ParseECPrivateKey([]byte(secret)); err == nil {
		return &key.PublicKey
	}
	if key, err := x509.ParsePKCS8PrivateKey([]byte(secret)); err == nil {
		if ecdsaKey, ok := key.(*ecdsa.PrivateKey); ok {
			return &ecdsaKey.PublicKey
		}
	}

	return nil
}

// fetchPublicKeyFromJWKS fetches the public key from Supabase's JWKS endpoint
func (s *SupabaseAuthService) fetchPublicKeyFromJWKS(kid string) (*ecdsa.PublicKey, error) {
	// Try different JWKS endpoint paths
	jwksURLs := []string{
		fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", s.supabaseURL),
		fmt.Sprintf("%s/.well-known/jwks.json", s.supabaseURL),
		fmt.Sprintf("%s/jwks", s.supabaseURL),
	}

	var lastErr error
	for _, jwksURL := range jwksURLs {
		fmt.Printf("DEBUG: Trying JWKS endpoint: %s\n", jwksURL)
		resp, err := http.Get(jwksURL)
		if err != nil {
			lastErr = fmt.Errorf("failed to fetch JWKS from %s: %w", jwksURL, err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			lastErr = fmt.Errorf("failed to read JWKS response: %w", err)
			continue
		}

		var jwks struct {
			Keys []struct {
				Kid string `json:"kid"`
				Kty string `json:"kty"`
				Crv string `json:"crv"`
				X   string `json:"x"`
				Y   string `json:"y"`
			} `json:"keys"`
		}

		if err := json.Unmarshal(body, &jwks); err != nil {
			lastErr = fmt.Errorf("failed to parse JWKS: %w", err)
			continue
		}

		// Find the key with matching kid
		for _, key := range jwks.Keys {
			if key.Kid == kid && key.Kty == "EC" && key.Crv == "P-256" {
				// Decode base64url-encoded coordinates
				xBytes, err := base64.RawURLEncoding.DecodeString(key.X)
				if err != nil {
					continue
				}
				yBytes, err := base64.RawURLEncoding.DecodeString(key.Y)
				if err != nil {
					continue
				}

				// Create ECDSA public key
				publicKey := &ecdsa.PublicKey{
					Curve: elliptic.P256(),
					X:     new(big.Int).SetBytes(xBytes),
					Y:     new(big.Int).SetBytes(yBytes),
				}

				fmt.Printf("DEBUG: Successfully fetched public key from JWKS for kid: %s\n", kid)
				return publicKey, nil
			}
		}

		lastErr = fmt.Errorf("public key with kid %s not found in JWKS", kid)
	}

	return nil, fmt.Errorf("failed to fetch public key from any JWKS endpoint: %w", lastErr)
}

// verifyTokenWithSupabase verifies the token by calling Supabase's user endpoint
// This is used for ES256 tokens when we can't easily get the public key for signature verification
func (s *SupabaseAuthService) verifyTokenWithSupabase(tokenString string) error {
	// Verify token by calling Supabase's user endpoint
	userURL := fmt.Sprintf("%s/auth/v1/user", s.supabaseURL)
	req, err := http.NewRequest("GET", userURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Use anon key for verifying user access tokens
	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenString))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to verify token with Supabase: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		// Token is valid according to Supabase
		return nil
	}

	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("Supabase rejected token (status %d): %s", resp.StatusCode, string(body))
}

// VerifyToken verifies a Supabase JWT token and returns the claims
func (s *SupabaseAuthService) VerifyToken(tokenString string) (*SupabaseClaims, error) {
	if len(s.jwtSecret) == 0 {
		return nil, fmt.Errorf("JWT secret is not configured")
	}

	// Parse token without verification first to see what we're dealing with
	parser := jwt.NewParser()
	token, _, err := parser.ParseUnverified(tokenString, &SupabaseClaims{})
	if err != nil {
		return nil, fmt.Errorf("%w: failed to parse token: %v", ErrInvalidToken, err)
	}

	// Log token info for debugging
	unverifiedClaims, _ := token.Claims.(*SupabaseClaims)
	fmt.Printf("DEBUG: Token algorithm: %v\n", token.Header["alg"])
	fmt.Printf("DEBUG: Token claims - Sub: %s, Email: %s, Exp: %d\n", unverifiedClaims.Sub, unverifiedClaims.Email, unverifiedClaims.Exp)

	// Check expiration first
	now := time.Now().Unix()
	if unverifiedClaims.Exp > 0 && now > unverifiedClaims.Exp {
		fmt.Printf("DEBUG: Token expired - Exp: %d, Now: %d\n", unverifiedClaims.Exp, now)
		return nil, ErrTokenExpired
	}

	alg, ok := token.Header["alg"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid algorithm in token header")
	}

	// For ES256, verify with Supabase API since we can't easily get the public key
	if alg == "ES256" {
		fmt.Printf("DEBUG: Verifying ES256 token with Supabase API\n")
		if err := s.verifyTokenWithSupabase(tokenString); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
		}
		// Token is valid according to Supabase, return the claims
		fmt.Printf("DEBUG: Token verified successfully via Supabase API - Sub: %s, Email: %s\n", unverifiedClaims.Sub, unverifiedClaims.Email)
		return unverifiedClaims, nil
	}

	// For HS256, verify signature normally
	if alg == "HS256" {
		token, err = jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})

		if err != nil {
			fmt.Printf("DEBUG: JWT verification error: %v\n", err)
			return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
		}

		if claims, ok := token.Claims.(*SupabaseClaims); ok && token.Valid {
			fmt.Printf("DEBUG: Token verified successfully - Sub: %s, Email: %s\n", claims.Sub, claims.Email)
			return claims, nil
		}
		return nil, ErrInvalidToken
	}

	return nil, fmt.Errorf("unsupported signing method: %v (expected HS256 or ES256)", alg)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// SyncUserFromToken syncs a user from Supabase token claims to local database
func (s *SupabaseAuthService) SyncUserFromToken(claims *SupabaseClaims) (*models.User, error) {
	if claims.Sub == "" {
		return nil, fmt.Errorf("missing user ID in token claims")
	}

	supabaseID := claims.Sub
	email := claims.Email

	// Try to get existing user by supabase_id
	user, err := s.userRepo.GetBySupabaseID(supabaseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by supabase_id: %w", err)
	}

	// If user exists, return it
	if user != nil {
		return user, nil
	}

	// User doesn't exist, create or update from Supabase
	// Check if user exists by email (for migration scenarios)
	existingByEmail, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	newUser := &models.User{
		SupabaseID: &supabaseID,
		Email:      email,
		Theme:      "light",
	}

	if existingByEmail != nil {
		// Update existing user with supabase_id
		updates := map[string]interface{}{
			"supabase_id": supabaseID,
			"updated_at":  time.Now(),
		}
		if err := s.userRepo.Update(existingByEmail.ID, updates); err != nil {
			return nil, fmt.Errorf("failed to update user with supabase_id: %w", err)
		}
		// Fetch updated user
		return s.userRepo.GetByID(existingByEmail.ID)
	}

	// Create new user
	if err := s.userRepo.CreateOrUpdateFromSupabase(newUser); err != nil {
		return nil, fmt.Errorf("failed to create user from Supabase: %w", err)
	}

	// Fetch the created user
	return s.userRepo.GetBySupabaseID(supabaseID)
}
