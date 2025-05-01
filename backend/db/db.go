package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// Create a global variable to store the database connection
// uppercase because other parts of the app can use this Database
var DB *sql.DB

func InitDB() {
	// Read environment variables
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	// Create connection string
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	// Connect to PostgreSQL
	var err error
	// Open needs a driver name and a connection string
	// driver name is the name of the driver we are using to connect to the database
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	// Retry pinging the database to check if it's reachable
	for i := 0; i < 10; i++ {
		err = DB.Ping()
		if err == nil {
			break
		}
		log.Printf("Waiting for database... (%d/10)", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Database not reachable: %v", err)
	}

	// Set the maximum number of open connections to the database
	// Pool of ongoing connections that can be used when needed by different parts of the app
	DB.SetMaxOpenConns(10)
	// Set the maximum number of idle connections to the database
	// Pool of idle connections that can be used when needed by different parts of the app
	// How many connections we want to keep open if no one's using these connections at the moment
	// This is to prevent the database from being overloaded
	DB.SetMaxIdleConns(5)

	fmt.Println("Successfully connected to PostgreSQL!")

	// Create the tables in the database
	createTables()

	fmt.Println("Tables created successfully!")
}

func createTables() {
	// Create the users table
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		avatar TEXT
	)
	`
	// Execute this query whenever the app starts
	_, err := DB.Exec(createUsersTable)

	if err != nil {
		fmt.Println("Error creating users table:", err)
		// Crash the app if we cannot create the table
		panic("Could not create users table.")
	}

	// Create the reset_tokens table
	createResetTokensTable := `
	 CREATE TABLE IF NOT EXISTS reset_tokens (
		 token TEXT PRIMARY KEY,
		 user_id INTEGER NOT NULL REFERENCES users(id),
		 expiry TIMESTAMP NOT NULL,
		 used BOOLEAN DEFAULT false
	 )
	 `
	_, err = DB.Exec(createResetTokensTable)
	if err != nil {
		fmt.Println("Error creating reset_tokens table:", err)
		panic("Could not create reset_tokens table.")
	}

	// Create the boards table
	createBoardsTable := `
	CREATE TABLE IF NOT EXISTS boards (
		id SERIAL PRIMARY KEY,
		title TEXT NOT NULL,
		background_color TEXT NOT NULL DEFAULT 'gray',
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)
	`
	_, err = DB.Exec(createBoardsTable)
	if err != nil {
		fmt.Println("Error creating boards table:", err)
		panic("Could not create boards table.")
	}

	// Create the board_members table (many-to-many relationship)
	createBoardMembersTable := `
	CREATE TABLE IF NOT EXISTS board_members (
		board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		PRIMARY KEY (board_id, user_id)
	)
`
	_, err = DB.Exec(createBoardMembersTable)
	if err != nil {
		fmt.Println("Error creating board_members table:", err)
		panic("Could not create board_members table.")
	}

	// Create the lists table
	// On delete cascade means that if the board is deleted, all lists associated with that board will be deleted as well
	// This is to prevent orphaned records in the lists table
	createListsTable := `
	CREATE TABLE IF NOT EXISTS lists (
		id SERIAL PRIMARY KEY,
		board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
		title TEXT NOT NULL,
		position DOUBLE PRECISION NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)
	`
	_, err = DB.Exec(createListsTable)
	if err != nil {
		fmt.Println("Error creating lists table:", err)
		panic("Could not create lists table.")
	}

	// Create the cards table
	createCardsTable := `
	CREATE TABLE IF NOT EXISTS cards (
		id SERIAL PRIMARY KEY,
		list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
		title TEXT NOT NULL,
		description TEXT,
		position DOUBLE PRECISION NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)
`
	_, err = DB.Exec(createCardsTable)
	if err != nil {
		fmt.Println("Error creating cards table:", err)
		panic("Could not create cards table.")
	}
}
