package routes

import (
	"log"
	"net/http"
	"strconv"

	"maps182/api/models"
	"maps182/api/utils"

	"github.com/gin-gonic/gin"
)

func signup(context *gin.Context) {
	// Get the name, email and password from the request body
	var user models.User

	// gin allows us to bind the request body to a struct
	// it will only bind the fields that are present in the request body
	// if the field is not present, it will be ignored
	// if the field is present, it will be bound to the struct
	// for example have an error if the email or password is not present
	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data.",
		})
		return
	}

	// Generate an avatar URL based on the email
	// This will be used to create a unique avatar for the user
	// The avatar URL is generated using the email address
	user.Avatar = utils.GenerateAvatarURL(user.Email)

	// Validate the user data
	// This method user uses a pointer to the user struct
	// in this case to review the email, name and password
	if err := user.ValidateSignup(); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	// Validate if email already exists
	// This method user uses a pointer to the user struct
	if err := user.ValidateExistingEmail(); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	// Save the user to the database
	err = user.Save()

	if err != nil {
		log.Printf("Error saving user: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not save user to database.",
		})
		return
	}

	// Return the user ID
	context.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully.",
	})
}

func login(context *gin.Context) {
	// Get the email and password from the request body
	var user models.User

	// gin allows us to bind the request body to a struct
	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data.",
		})
		return
	}

	// Validate the credentials
	// This method user uses a pointer to the user struct
	// hence it can modify the struct user User that we stated here
	err = user.ValidateCredentials()

	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{
			"message": err.Error(),
		})
		return
	}

	// Generate an access and refresh token
	// The id is not part of the incoming request, so we need to get it from the database
	// in ValidateCredentials method we get the id and the email from the database
	// the id is stored in the user struct, hence is accessible here
	tokens, err := utils.GenerateTokenPair(user.ID, user.Email)

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not generate access and refresh tokens",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message":      "Login successful.",
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
		"expiresIn":    tokens.ExpiresIn,
	})
}

func isAvalable(context *gin.Context) {
	// Get the email from the request body
	var user models.User

	// gin allows us to bind the request body to a struct
	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data.",
		})
		return
	}

	// Validate the email
	if err := user.ValidateExistingEmail(); err != nil {
		context.JSON(http.StatusCreated, gin.H{
			"isAvailable": false,
		})
		return
	}

	context.JSON(http.StatusCreated, gin.H{
		"isAvailable": true,
	})
}

func forgotPassword(context *gin.Context) {
	var req models.ForgotPasswordRequest

	if err := context.ShouldBindJSON(&req); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data.",
		})
		return
	}

	// Find the user by email
	user, err := models.GetUserByEmail(req.Email)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{
			"message": "Could not find a user associated with this email.",
		})
		return
	}

	// Create a password reset token
	token, err := user.CreatePasswordResetToken()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not generate reset token.",
		})
		return
	}

	// Generate reset URL
	resetURL := "http://localhost:4200/recovery?token=" + token

	// Send email
	err = utils.SendPasswordResetEmail(user.Email, resetURL)
	if err != nil {
		log.Println("Error sending email:", err.Error())
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not send reset email.",
		})
		return
	}

	// Don't reveal if email exists (security)
	context.JSON(http.StatusOK, gin.H{
		"message": "If your email is registered, you will receive a password reset link.",
	})
}

func verifyResetToken(context *gin.Context) {
	token := context.Param("token")

	// Verify the token
	_, err := models.VerifyResetToken(token)
	if err != nil {
		context.JSON(http.StatusOK, gin.H{
			"valid": false,
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"valid": true,
	})
}

func resetPassword(context *gin.Context) {
	var req models.ResetPasswordRequest

	if err := context.ShouldBindJSON(&req); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data.",
		})
		return
	}

	// Verify the token and get the user
	user, err := models.VerifyResetToken(req.Token)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid or expired token.",
		})
		return
	}

	// Update the password
	err = user.UpdatePassword(req.NewPassword)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not update password.",
		})
		return
	}

	// Mark the token as used
	err = models.MarkTokenAsUsed(req.Token)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Something went wrong while updating the password.",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Password updated successfully.",
	})
}

func getUser(context *gin.Context) {
	// Get the user as path parameter
	userId := context.Param("userId")

	// Convert string to int64
	userIdInt, err := strconv.ParseInt(userId, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid user ID format.",
		})
		return
	}
	// Get the user from the database
	user, err := models.GetUserByID(userIdInt)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not get user.",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"id":     user.ID,
		"name":   user.Name,
		"email":  user.Email,
		"avatar": user.Avatar,
	})
}

func getAllUsers(context *gin.Context) {
	// Get all users from the database
	users, err := models.GetAllUsers()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not get users.",
		})
		return
	}

	// Create a slice to hold the response data
	userResponses := make([]models.UserResponse, len(users))

	// Map each user to the response structure
	for i, user := range users {
		userResponses[i] = models.UserResponse{
			ID:     user.ID,
			Name:   user.Name,
			Email:  user.Email,
			Avatar: user.Avatar,
		}
	}

	context.JSON(http.StatusOK, userResponses)
}

// getOwnProfile returns the profile of the currently authenticated user
func getOwnProfile(context *gin.Context) {
	// Get the authenticated user ID from the context
	// This was set by the authentication middleware
	userID, exists := context.Get("userId")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "User ID not found in context.",
		})
		return
	}

	// Convert userID to int64 (it's stored as an interface{} in the context)
	userIDInt64, ok := userID.(int64)
	if !ok {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Invalid user ID format in context.",
		})
		return
	}

	// Fetch the user data from the database
	user, err := models.GetUserByID(userIDInt64)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not retrieve user data.",
		})
		return
	}

	// Return the user profile
	context.JSON(http.StatusOK, gin.H{
		"id":     user.ID,
		"name":   user.Name,
		"email":  user.Email,
		"avatar": user.Avatar,
	})
}

func refreshToken(context *gin.Context) {
	var req utils.RefreshTokenRequest

	if err := context.ShouldBindJSON(&req); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format",
		})
		return
	}

	// Validate the refresh token
	userId, err := utils.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid refresh token",
			"error":   err.Error(),
		})
		return
	}

	// Get user data for generating new tokens
	user, err := models.GetUserByID(userId)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not retrieve user data",
		})
		return
	}

	// Generate new token pair
	tokens, err := utils.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not generate new tokens",
			"error":   err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, tokens)
}
