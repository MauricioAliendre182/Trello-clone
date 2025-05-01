package utils

import (
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	// Generate a new hash for the password
	// Convert the password to a byte slice
	// cost parameter is the complexity of the hash
	// the higher the cost, the more secure the hash
	// but it will also take longer to generate
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	// Return the hashed password
	return string(bytes), err
}

func CheckPasswordHash(password, hashedPassword string) bool {
	// Compare the password with the hash
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))

	// Return true if the password is correct or false otherwise
	return err == nil
}
