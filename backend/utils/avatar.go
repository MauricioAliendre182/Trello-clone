package utils

import (
	"crypto/sha256"
	"encoding/hex"
)

// GenerateAvatarURL creates a deterministic avatar URL from an email
func GenerateAvatarURL(email string) string {
	// Hash the email for consistency
	hash := sha256.Sum256([]byte(email))
	seed := hex.EncodeToString(hash[:8]) // Use first 8 bytes of hash as seed

	// Return DiceBear URL with the style you prefer
	return "https://api.dicebear.com/7.x/avataaars/svg?seed=" + seed
}
