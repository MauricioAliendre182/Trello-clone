package models

import (
	"database/sql"
	"errors"
	"maps182/api/db"
	"time"
)

// Board represents a Trello-like board
type Board struct {
	ID              int64          `json:"id"`
	Title           string         `json:"title" binding:"required"`
	BackgroundColor string         `json:"backgroundColor"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	Members         []UserResponse `json:"members,omitempty"`
	Lists           []List         `json:"lists,omitempty"`
	Cards           []Card         `json:"cards,omitempty"`
}

// BoardMember represents a user's membership in a board
type BoardMember struct {
	BoardID   int64     `json:"boardId"`
	UserID    int64     `json:"userId"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

// CreateBoard creates a new board and assigns the creator as owner
// *Board is a pointer to the Board struct
// This is used to return the created board with its ID and other fields populated
func CreateBoard(userID int64, title string, backgroundColor string) (*Board, error) {
	// Start a transaction
	// Begin() returns a pointer to a transaction object
	// and an error if it exists
	// The transaction object is used to execute queries
	// and commit or rollback the transaction
	// A transaction is a way to group multiple queries into a single unit of work
	// If any of the queries fail, the transaction can be rolled back
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() // Will be ignored if tx.Commit() is called

	// Create the board
	var board Board
	query := `
    INSERT INTO boards (title, background_color)
    VALUES ($1, $2)
    RETURNING id, title, background_color, created_at, updated_at
    `

	// Use default color if not provided
	if backgroundColor == "" {
		backgroundColor = "gray"
	}

	// Execute the query
	// The QueryRow method returns a single row from the database
	// The Scan method scans the row into the board struct
	err = tx.QueryRow(query, title, backgroundColor).Scan(
		&board.ID,
		&board.Title,
		&board.BackgroundColor,
		&board.CreatedAt,
		&board.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Add the creator as owner
	memberQuery := `
    INSERT INTO board_members (board_id, user_id, role)
    VALUES ($1, $2, 'owner')
    `
	_, err = tx.Exec(memberQuery, board.ID, userID)
	if err != nil {
		return nil, err
	}

	// Create default "To Do", "In Progress" and "Done" lists
	listQueries := []struct {
		title    string
		position int
	}{
		{"To Do", 0},
		{"In Progress", 1},
		{"Done", 2},
	}

	for _, list := range listQueries {
		listQuery := `
		INSERT INTO lists (board_id, title, position)
		VALUES ($1, $2, $3)
		`
		_, err = tx.Exec(listQuery, board.ID, list.title, list.position)
		if err != nil {
			return nil, err
		}
	}

	// Commit the transaction
	// Commit() will apply all the changes made in the transaction
	// If any of the queries fail, the transaction will be rolled back
	// and no changes will be applied to the database
	// If Commit() is successful, the transaction is closed
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// Return the created board
	// The board struct is populated with the ID, title, background color, created at and updated at fields
	return &board, nil
}

// GetBoards retrieves all boards a user is a member of
func GetBoardsByUserID(userID int64) ([]Board, error) {
	// This query retrieves all boards a user is a member of
	// It joins the boards and board_members tables to get the boards
	query := `
    SELECT b.id, b.title, b.background_color, b.created_at, b.updated_at
    FROM boards b
    JOIN board_members bm ON b.id = bm.board_id
    WHERE bm.user_id = $1
    ORDER BY b.updated_at DESC
    `

	rows, err := db.DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []Board
	// Next() iterates over the rows returned by the query
	// Scan() scans the values of the current row into the board struct
	for rows.Next() {
		var board Board
		err := rows.Scan(
			&board.ID,
			&board.Title,
			&board.BackgroundColor,
			&board.CreatedAt,
			&board.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		boards = append(boards, board)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return boards, nil
}

// GetBoardWithMembersListsAndCards retrieves a board by ID with all its members, lists and cards
func GetBoardWithMembersListsAndCards(boardID, userID int64) (*Board, error) {
	// First, check if the user is a member of the board
	memberQuery := `
    SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2
    `
	var exists int
	err := db.DB.QueryRow(memberQuery, boardID, userID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("not a member of this board")
		}
		return nil, err
	}

	// Get the board
	boardQuery := `
    SELECT id, title, background_color, created_at, updated_at
    FROM boards
    WHERE id = $1
    `
	var board Board
	err = db.DB.QueryRow(boardQuery, boardID).Scan(
		&board.ID,
		&board.Title,
		&board.BackgroundColor,
		&board.CreatedAt,
		&board.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("board not found")
		}
		return nil, err
	}

	// Get the members
	// This query retrieves all members of the board
	// It joins the users and board_members tables to get the members
	// The members are stored in the board struct
	membersQuery := `
    SELECT u.id, u.name, u.email, u.avatar
    FROM users u
    JOIN board_members bm ON u.id = bm.user_id
    WHERE bm.board_id = $1
    `
	rows, err := db.DB.Query(membersQuery, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []UserResponse
	// Next() iterates over the rows returned by the query
	// Scan() scans the values of the current row into the board struct
	for rows.Next() {
		var member UserResponse
		err := rows.Scan(
			&member.ID,
			&member.Name,
			&member.Email,
			&member.Avatar,
		)
		if err != nil {
			return nil, err
		}
		// append the member to the members slice
		// append works like a push in JS
		// it adds the member to the end of the slice
		members = append(members, member)
	}

	// Here we are overriding the members slice in the board struct
	// with the members slice we just created
	board.Members = members

	// Get the lists for the board ordered by position
	listsQuery := `
    SELECT id, board_id, title, position, created_at, updated_at
    FROM lists
    WHERE board_id = $1
    ORDER BY position
    `

	// Query() returns a pointer to a Rows struct
	// The Rows struct is used to iterate over the rows returned by the query
	listRows, err := db.DB.Query(listsQuery, boardID)
	if err != nil {
		return nil, err
	}
	defer listRows.Close()

	// Define a slice of List structs
	// The List struct is defined in the models package
	// Also define a slice of Card structs
	// The Card struct is defined in the models package
	var lists []List
	var allCards []Card // This will collect ALL cards for the board

	// Next() iterates over the rows returned by the query
	// Scan() scans the values of the current row into the list struct
	// The list struct is a slice of List structs
	for listRows.Next() {
		var list List
		err := listRows.Scan(
			&list.ID,
			&list.BoardID,
			&list.Title,
			&list.Position,
			&list.CreatedAt,
			&list.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		lists = append(lists, list)
	}

	// Check for errors after iterating over the rows
	// If there are any errors, return them
	if err = listRows.Err(); err != nil {
		return nil, err
	}

	// For each list, get its cards
	for i := range lists {
		// Get cards ordered by position
		cardsQuery := `
        SELECT id, list_id, title, description, position, created_at, updated_at
        FROM cards
        WHERE list_id = $1
        ORDER BY position
        `
		cardRows, err := db.DB.Query(cardsQuery, lists[i].ID)
		if err != nil {
			return nil, err
		}
		defer cardRows.Close()

		// Create a NEW slice for each list's cards
		var listCards []Card

		for cardRows.Next() {
			var card Card
			err := cardRows.Scan(
				&card.ID,
				&card.ListID,
				&card.Title,
				&card.Description,
				&card.Position,
				&card.CreatedAt,
				&card.UpdatedAt,
			)
			if err != nil {
				return nil, err
			}

			// Add list ID to the card
			card.ListID = lists[i].ID

			// Add to this list's cards
			listCards = append(listCards, card)

			// Also add to all cards collection
			allCards = append(allCards, card)
		}

		if err = cardRows.Err(); err != nil {
			return nil, err
		}

		// Assign the cards to the list
		lists[i].Cards = listCards
	}

	// Assign the lists to the board
	board.Lists = lists

	// Assing the cards to the board
	board.Cards = allCards

	return &board, nil
}

// UpdateBoard updates a board's title and background color
func UpdateBoard(boardID, userID int64, title, backgroundColor string) error {
	// First, check if the user is an owner or admin of the board
	roleQuery := `
    SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2
    `
	var role string
	err := db.DB.QueryRow(roleQuery, boardID, userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("not a member of this board")
		}
		return err
	}

	if role != "owner" && role != "admin" {
		return errors.New("insufficient permissions")
	}

	// Update the board
	query := `
    UPDATE boards 
    SET title = $1, background_color = $2, updated_at = NOW()
    WHERE id = $3
    `
	_, err = db.DB.Exec(query, title, backgroundColor, boardID)

	// return any error that occurs
	return err
}

// DeleteBoard deletes a board
func DeleteBoard(boardID, userID int64) error {
	// First, check if the user is the owner of the board
	roleQuery := `
    SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2
    `
	var role string
	err := db.DB.QueryRow(roleQuery, boardID, userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("not a member of this board")
		}
		return err
	}

	if role != "owner" {
		return errors.New("only the owner can delete a board")
	}

	// Delete the board (cascade will handle related records)
	query := `
    DELETE FROM boards WHERE id = $1
    `
	_, err = db.DB.Exec(query, boardID)

	// return any error that occurs
	return err
}

// AddMember adds a user to a board
func AddMember(boardID, userID, newMemberID int64, role string) error {
	// Check if the user has permission to add members
	roleQuery := `
    SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2
    `
	var currentRole string
	err := db.DB.QueryRow(roleQuery, boardID, userID).Scan(&currentRole)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("not a member of this board")
		}
		return err
	}

	if currentRole != "owner" && currentRole != "admin" {
		return errors.New("insufficient permissions")
	}

	// Add the new member
	// This query inserts a new member into the board_members table
	// If the member already exists, it updates the role
	query := `
    INSERT INTO board_members (board_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (board_id, user_id) DO UPDATE
    SET role = $3
    `

	// Validate role
	if role != "admin" && role != "member" {
		role = "member" // Default role
	}

	// Run the query
	// The Exec() method executes the query and returns the number of rows affected
	_, err = db.DB.Exec(query, boardID, newMemberID, role)

	// return any error that occurs
	return err
}
