package models

import (
	"errors"
	"maps182/api/db"
	"time"
)

// ForgotPasswordRequest holds the email for password reset
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest holds the token and new password
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

// VerifyResetToken checks if a token is valid and belongs to a user
func VerifyResetToken(token string) (User, error) {
	var user User

	query := `
    SELECT u.id, u.name, u.email
    FROM reset_tokens r
    JOIN users u ON r.user_id = u.id
    WHERE r.token = $1 AND r.expiry > $2 AND r.used = false
    `

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return user, err
	}
	defer stmt.Close()

	err = stmt.QueryRow(token, time.Now()).Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		return user, errors.New("Invalid or expired token")
	}

	return user, nil
}

// MarkTokenAsUsed marks a reset token as used
func MarkTokenAsUsed(token string) error {
	query := `
    UPDATE reset_tokens
    SET used = true
    WHERE token = $1
    `

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(token)
	return err
}
