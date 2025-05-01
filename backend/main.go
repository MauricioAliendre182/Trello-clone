package main

import (
	"log"
	"maps182/api/db"
	"maps182/api/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables at application startup
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file:", err)
		// You can decide whether to continue or exit based on your requirements
		// In production environments, you might set environment variables differently
	}

	// Initialize the database
	db.InitDB()

	// HTTP Server for us
	server := gin.Default()

	// Register the routes
	routes.RegisterRoutes(server)

	// Start listening for incoming request
	// in this case the port is 8090
	server.Run(":8090")
}
