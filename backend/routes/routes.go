package routes

import (
	"maps182/api/middlewares"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(server *gin.Engine) {
	// Configure cors
	server.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4200", "http://localhost"}, // or your frontend domain
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Since we are using a pointer to the gin.Engine, we do not have to return anything
	// we can directly modify the server

	// There are two ways of registering a middleware
	// 1. A function that we call as middleware.Aunthenticate for every route
	// For example: server.POST("/events", middleware.Authenticate, createEvent)
	// 2. Configure a server.Group() and attach the middleware to the group
	authenticated := server.Group("/api/v1")
	nonAuthenticated := server.Group("/api/v1")

	// Set up a middleware to always run before the request handler
	// This middleware will check if the user is authenticated
	authenticated.Use(middlewares.Authenticate)

	// EXAMPLE FOR USING MIDDLEWARES
	// Handler for POST incoming http request
	// handler is a function that will be called when a POST request is made to the /events endpoint
	// authenticated.POST("/events", createEvent)

	// Signup route for user registration
	nonAuthenticated.POST("/auth/signup", signup)

	// Login route for user authentication
	nonAuthenticated.POST("/auth/login", login)

	// Add a route for refreshing tokens
	nonAuthenticated.POST("/auth/refresh-token", refreshToken)

	// Is available route to see if a user exists or not
	nonAuthenticated.POST("/auth/is-available", isAvalable)
	// Password recovery routes
	nonAuthenticated.POST("/auth/forgot-password", forgotPassword)
	nonAuthenticated.GET("/auth/verify-reset-token/:token", verifyResetToken)
	nonAuthenticated.POST("/auth/reset-password", resetPassword)

	// Profile route to get the user profile
	// This route is protected by the middleware
	authenticated.GET("/auth/profile", getOwnProfile)
	authenticated.GET("/me/profile", getOwnProfile)

	// User routes
	// Get user by ID
	// This route is protected by the middleware
	// The user ID will be set in the context by the middleware
	authenticated.GET("/users/:userId", getUser)
	authenticated.GET("/users", getAllUsers)

	// Board routes
	authenticated.GET("/me/boards", getUserBoards)
	authenticated.GET("/boards", getUserBoards) // Alias for /me/boards
	authenticated.POST("/boards", createBoard)
	authenticated.GET("/boards/:id", getBoard)
	authenticated.PUT("/boards/:id", updateBoard)
	authenticated.DELETE("/boards/:id", deleteBoard)
	authenticated.POST("/boards/:id/members", addBoardMember)

	// List routes
	authenticated.GET("/boards/:id/lists", getLists)
	authenticated.POST("/boards/:id/lists", createList)
	authenticated.PUT("/lists/:id", updateList)
	authenticated.DELETE("/lists/:id", deleteList)

	// Card routes
	authenticated.POST("/lists/:id/cards", createCard)
	authenticated.PUT("/cards/:id", updateCard)
	authenticated.DELETE("/cards/:id", deleteCard)
}
