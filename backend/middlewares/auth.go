package middlewares

import (
	"net/http"

	"maps182/api/utils"

	"github.com/gin-gonic/gin"
)

func Authenticate(context *gin.Context) {
	// The client that do send requests to such protected routes
	// will have to attach such a valid token as part of their request header
	// Get the value of the specific header that is attached to the request
	token := context.Request.Header.Get("Authorization")

	// Empty token case
	// As this is a middleware we need to abourt the current request
	// for that we will user AbortWithStatusJSON
	// it will abort the request and send a JSON response with the status code
	// and the data that we want to send
	// No other request handlers will be executed after this
	if token == "" {
		context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"model": "Not authorized",
		})
		return
	}

	// Validate the token specifically as an access token
	userId, err := utils.ValidateAccessToken(token)
	// If the token is invalid, we will get an error
	if err != nil {
		context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"message": err.Error(),
		})
		return
	}

	// Set the user ID in the context
	// This will be used by the request handlers to get the user ID
	// This is how we can pass data between middleware and request handlers
	context.Set("userId", userId)

	// Continue with the request (the next request handler)
	context.Next()
}
