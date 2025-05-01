package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Token types
const (
	AccessToken  = "access"
	RefreshToken = "refresh"
)

// TokenResponse holds both access and refresh tokens
type TokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"` // Access token expiry in seconds
}

// RefreshTokenRequest holds the refresh token
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

func generateToken(userID int64, email string, tokenType string, expiration time.Duration) (string, error) {
	// Create a new JWT token
	// NewWithClaims creates a new JWT token with the given claims
	// jwt.SigningMethodHS256 is a signing approach that uses a secret key to sign the token
	// it is an important step bacause that signature can then be checked by the server in the future
	// when clients send such a token to the server to verify that it is a valid token
	// jwt.MapClaims is a struct that contains the claims of the token
	// "exp" will be used internally by the server to check if the token is expired
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"email":  email,
		"type":   tokenType,         // New field to identify token type
		"iat":    time.Now().Unix(), // Issued at time
		"exp":    time.Now().Add(expiration).Unix(),
	})

	// Sign the token with the secret key
	// the key will be used to verify incoming tokens
	// we need to convert the secret key to a byte slice
	// because the key is a string and the SignedString method expects a byte slice
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func validateTokenWithType(token string) (int64, string, error) {
	// Check if the token starts with "Bearer " and extract the actual token
	const bearerPrefix = "Bearer "
	if len(token) > len(bearerPrefix) && token[:len(bearerPrefix)] == bearerPrefix {
		// Extract the actual token part (remove "Bearer " prefix)
		token = token[len(bearerPrefix):]
	}

	// Parse validates the signature of a token
	// the first argument is the token a such
	// the second argument is the an anonymous function that will return 'any' (interface{}) and 'error'
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		// We want to check the type of Signing Method
		// which in this case is SigningMethodHMAC which is a version of SigningMethodHS256
		// to check the value type we use the syntax .() in GO to make an assertion
		// EXAMPLE
		// sess.Values["user"] is an interface{}, and what is between parenthesis is called a type assertion.
		// It checks that the value of sess.Values["user"] is of type bson.ObjectId.
		// If it is, then ok will be true. Otherwise, it will be false.
		_, ok := token.Method.(*jwt.SigningMethodHMAC)

		if !ok {
			return nil, errors.New("Unexpected signing method")
		}

		// Here we are returning the secret key as a byte slice
		// so that the token can be verified
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	// Handle parsing errors
	if err != nil {
		// Check if the error is about token expiration
		if errors.Is(err, jwt.ErrTokenExpired) {
			return 0, "", errors.New("Token has expired")
		}
		return 0, "", errors.New("Could not parse token")
	}

	tokenIsValid := parsedToken.Valid

	if !tokenIsValid {
		return 0, "", errors.New("Invalid Token!")
	}

	// We want to check that whether the claims we got for this token
	// is of jwt.MapClaims type
	claims, ok := parsedToken.Claims.(jwt.MapClaims)

	// claims are of type jwt.MapClaims which is more specific
	if !ok {
		return 0, "", errors.New("Invalid token claims.")
	}

	// claims is essentially a map
	// so we can get the claims in that way
	// claims["userId"] will return a float64 despite we passed it as an int64
	// so we need to convert it to an int64
	// we can do that by asserting it to a float64 and then converting it to an int64
	userId, ok := claims["userId"].(float64)
	if !ok {
		return 0, "", errors.New("Invalid user ID in token")
	}

	// Get token type
	tokenType, ok := claims["type"].(string)
	if !ok {
		return 0, "", errors.New("Invalid token type")
	}

	// We want to return the actual userId
	// and nil if there is no error
	// this is to avoid having a harcoded UserId in routes/events.go
	return int64(userId), tokenType, nil

}

// GenerateTokenPair generates both access and refresh tokens
func GenerateTokenPair(userID int64, email string) (TokenResponse, error) {
	// Create access token (short-lived, e.g., 15 minutes)
	accessToken, err := generateToken(userID, email, AccessToken, time.Minute*15)
	if err != nil {
		return TokenResponse{}, err
	}

	// Create refresh token (long-lived, e.g., 7 days)
	refreshToken, err := generateToken(userID, email, RefreshToken, time.Hour*24*7)
	if err != nil {
		return TokenResponse{}, err
	}

	return TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    15 * 60, // 15 minutes in seconds
	}, nil
}

// ValidateAccessToken validates an access token and returns the user ID
func ValidateAccessToken(tokenString string) (int64, error) {
	userId, tokenType, err := validateTokenWithType(tokenString)
	if err != nil {
		return 0, err
	}

	// Ensure this is an access token
	if tokenType != AccessToken {
		return 0, errors.New("Not an access token")
	}

	return userId, nil
}

// ValidateRefreshToken validates a refresh token and returns the user ID
func ValidateRefreshToken(tokenString string) (int64, error) {
	userId, tokenType, err := validateTokenWithType(tokenString)
	if err != nil {
		return 0, err
	}

	// Ensure this is a refresh token
	if tokenType != RefreshToken {
		return 0, errors.New("Not a refresh token")
	}

	return userId, nil
}
