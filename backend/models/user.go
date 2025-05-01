package models

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"regexp"
	"time"

	"maps182/api/db"
	"maps182/api/utils"
)

type User struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password"`
	Avatar   string `json:"avatar"`
}

// Add this to your models or create a separate response models file
type UserResponse struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Avatar string `json:"avatar"`
}

func (u *User) Save() error {
	// query to insert the event into the database
	// The question marks are placeholders for the values
	// that will be inserted into the database
	// It will prevent SQL injection
	query := `
	INSERT INTO users (name, email, password, avatar)
	VALUES ($1, $2, $3, $4)
	RETURNING id
	`
	// Prepare the query
	stmt, err := db.DB.Prepare(query)

	// Return the error if it exists
	if err != nil {
		return err
	}

	// Close connection after the function is done
	defer stmt.Close()

	// Hash the password
	hashedPassword, err := utils.HashPassword(u.Password)

	// Return the error if it exists
	if err != nil {
		return err
	}

	// Execute the query
	// The QueryRow method returns a single row from the database
	// The Scan method copies the columns from the row into the variables
	// in this case we are using the Scan method to copy the ID of the user
	err = stmt.QueryRow(u.Name, u.Email, hashedPassword, u.Avatar).Scan(&u.ID)

	if err != nil {
		return err
	}

	// Return nil if the query is successful
	return nil
}

// We need to use the pointer for the User struct
// to avoid copying the entire struct
// and instead make the login process over the same struct
func (u *User) ValidateCredentials() error {
	// Get the user from the database
	query := `
	SELECT id, password 
	FROM users
	WHERE email = $1
	`

	// Prepare the query
	// Prepare is to prevent SQL injection
	stmt, err := db.DB.Prepare(query)

	if err != nil {
		return err
	}

	// Close connection after the function is done
	defer stmt.Close()

	// Execute the query
	row := stmt.QueryRow(u.Email)

	// Check if the user exists
	// Scan copies the columns from the row into the variables
	var retrievedPassword string
	// Our u.ID gets updated on the one original user value on which we are
	// operating when we are logging in with a user
	err = row.Scan(&u.ID, &retrievedPassword)

	if err != nil {
		return err
	}

	// Check if the password is correct
	passwordIsValid := utils.CheckPasswordHash(u.Password, retrievedPassword)

	// If the password is incorrect, return false
	if !passwordIsValid {
		return errors.New("Credentials are invalid.")
	}

	// Return nil if the password is correct
	return nil
}

// Here I will add the validation for the signup process
// This is a method that will be called when the user tries to sign up
func (u *User) ValidateSignup() error {
	// Check email format
	emailRegex := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)
	if !emailRegex.MatchString(u.Email) {
		return errors.New("Invalid email format")
	}

	// Check password length
	if len(u.Password) < 8 {
		return errors.New("Password must be at least 8 characters long")
	}

	// Check name is not empty
	if len(u.Name) == 0 {
		return errors.New("Name cannot be empty")
	}

	return nil
}

func (u *User) ValidateExistingEmail() error {
	// Check if the email already exists in the database
	query := `
	SELECT id 
	FROM users 
	WHERE email = $1`

	// Prepare the query
	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Execute the query
	var existingID int64
	err = stmt.QueryRow(u.Email).Scan(&existingID)

	// If no error, it means email exists
	if err == nil {
		return errors.New("Email already exists")
	}

	// If error is "no rows", it means email doesn't exist, which is good
	// Any other error should be returned
	if err.Error() == "sql: no rows in result set" {
		return nil
	}

	// Return any other database errors
	return err
}

// GetUserByEmail retrieves a user by email
func GetUserByEmail(email string) (User, error) {
	var user User
	query := `
    SELECT id, name, email
    FROM users
    WHERE email = $1
    `

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return user, err
	}
	defer stmt.Close()

	err = stmt.QueryRow(email).Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		return user, err
	}

	return user, nil
}

// CreatePasswordResetToken generates and stores a reset token for a user
func (u *User) CreatePasswordResetToken() (string, error) {
	// Generate a secure token
	token := make([]byte, 32)
	_, err := rand.Read(token)
	if err != nil {
		return "", err
	}

	// Convert to hex string
	tokenStr := hex.EncodeToString(token)

	// Store in database
	query := `
    INSERT INTO reset_tokens (token, user_id, expiry)
    VALUES ($1, $2, $3)
    ON CONFLICT (token) DO UPDATE
    SET expiry = $3, used = false
    `

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return "", err
	}
	defer stmt.Close()

	// Token expires in 20 minutes
	// This is a good time for the user to reset their password
	expiry := time.Now().Add(20 * time.Minute)

	_, err = stmt.Exec(tokenStr, u.ID, expiry)
	if err != nil {
		return "", err
	}

	return tokenStr, nil
}

// UpdatePassword updates a user's password
func (u *User) UpdatePassword(newPassword string) error {
	// Hash the new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update in the database
	query := `
    UPDATE users
    SET password = $1
    WHERE id = $2
    `

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(hashedPassword, u.ID)
	if err != nil {
		return err
	}

	return nil
}

// GetUserByID retrieves a user by ID
func GetUserByID(id int64) (User, error) {
	var user User
	query := `
	SELECT id, name, email, avatar
	FROM users
	WHERE id = $1
	`

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return user, err
	}
	defer stmt.Close()

	err = stmt.QueryRow(id).Scan(&user.ID, &user.Name, &user.Email, &user.Avatar)
	if err != nil {
		return user, err
	}

	return user, nil
}

// GetAllUsers retrieves all users from the database
func GetAllUsers() ([]User, error) {
	var users []User
	query := `
	SELECT id, name, email, avatar
	FROM users
	`

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return users, err
	}
	defer stmt.Close()

	rows, err := stmt.Query()
	if err != nil {
		return users, err
	}
	defer rows.Close()

	for rows.Next() {
		var user User
		err = rows.Scan(&user.ID, &user.Name, &user.Email, &user.Avatar)
		if err != nil {
			return users, err
		}
		users = append(users, user)
	}

	return users, nil
}
