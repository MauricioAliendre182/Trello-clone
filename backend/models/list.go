package models

import (
	"database/sql"
	"errors"
	"maps182/api/db"
	"time"
)

// List represents a list on a board
type List struct {
	ID        int64     `json:"id"`
	BoardID   int64     `json:"boardId"`
	Title     string    `json:"title" binding:"required"`
	Position  float64   `json:"position"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Cards     []Card    `json:"cards,omitempty"` // Optional field to include cards in the list
}

// GetListsByBoardID retrieves all lists for a board
func GetListsByBoardID(boardID, userID int64) ([]List, error) {
	// First check if user is a member of the board
	memberCheck := `
    SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2
    `
	var exists int
	err := db.DB.QueryRow(memberCheck, boardID, userID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("not a member of this board")
		}
		return nil, err
	}

	// Get lists
	// This query retrieves all lists for the specified board
	// It orders them by position
	// The list can be 'To Do', 'In Progress', 'Done', etc.
	// The lists are stored in the list struct
	query := `
    SELECT id, board_id, title, position, created_at, updated_at
    FROM lists
    WHERE board_id = $1
    ORDER BY position
    `

	rows, err := db.DB.Query(query, boardID)
	if err != nil {
		return nil, err
	}
	// defer rows.Close() is used to ensure that the rows are closed after the function returns
	// This is important to free up resources and avoid memory leaks
	defer rows.Close()

	var lists []List
	// Next() iterates over the rows returned by the query
	// Scan() scans the values of the current row into the list struct
	for rows.Next() {
		var list List
		err := rows.Scan(
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

	return lists, nil
}

// CreateList creates a new list on a board
// *List is a pointer to the List struct, which allows us to return a reference to the created list
// This is useful for avoiding unnecessary copying of data
// position *float64 is a pointer to an float64, which allows us to pass a nil value
func CreateList(boardID, userID int64, title string, position *float64) (*List, error) {
	// Check if user is a member of the board
	memberCheck := `
    SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2
    `
	var exists int
	err := db.DB.QueryRow(memberCheck, boardID, userID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("not a member of this board")
		}
		return nil, err
	}

	// Start a transaction for consistency
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Determine position
	var listPosition float64
	if position == nil {
		// If no position provided
		// Get the maximum position
		// This query retrieves the maximum position of lists for the specified board
		// It uses COALESCE to return -1 if there are no lists yet
		// COALESCE is a SQL function that returns the first non-null value in the list of arguments
		// In this case, it returns the maximum position or -1 if there are no lists
		posQuery := `
		SELECT COALESCE(MAX(position), -1.0) + 1.0 FROM lists WHERE board_id = $1
		`
		err = db.DB.QueryRow(posQuery, boardID).Scan(&listPosition)
		if err != nil {
			return nil, err
		}
	} else {
		// Use the provided position
		listPosition = *position

		// Shift existing lists to make room
		_, err = tx.Exec(`
        UPDATE lists 
        SET position = $2
        WHERE board_id = $1
        `, boardID, listPosition)

		if err != nil {
			return nil, err
		}
	}

	// Create the list
	// This query inserts a new list into the lists table
	// It uses the provided board ID, title, and position
	query := `
    INSERT INTO lists (board_id, title, position)
    VALUES ($1, $2, $3)
    RETURNING id, board_id, title, position, created_at, updated_at
    `

	var list List
	err = db.DB.QueryRow(query, boardID, title, position).Scan(
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

	// Commit the transaction
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &list, nil
}

// UpdateList updates a list's title and/or position
// The position is optional and can be nil
// position *float64 is a pointer to an float64, which allows us to pass a nil value
func UpdateList(listID, userID int64, title string, position *float64) (*List, error) {
	// Check if user is a member of the board that owns this list
	memberCheck := `
    SELECT 1 FROM board_members 
    JOIN lists ON board_members.board_id = lists.board_id
    WHERE lists.id = $1 AND board_members.user_id = $2
    `
	var exists int
	err := db.DB.QueryRow(memberCheck, listID, userID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("not a member of the board that owns this list")
		}
		return nil, err
	}

	// Start transaction for potential position updates
	// Begin a transaction to ensure that all operations are atomic
	// This means that either all operations succeed or none do
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}

	// defer tx.Rollback() is used to ensure that the transaction is rolled back if any error occurs
	// This is important to maintain data integrity and avoid partial updates
	defer tx.Rollback()

	// If position is provided, handle reordering
	if position != nil {
		// Get current list info
		var boardID int64
		var currentPos float64

		// This query retrieves the current position and board ID of the list
		// It uses the list ID to find the correct row in the lists table
		posQuery := `SELECT board_id, position FROM lists WHERE id = $1`
		err = tx.QueryRow(posQuery, listID).Scan(&boardID, &currentPos)
		if err != nil {
			return nil, err
		}

		// Update positions of other lists
		// *position is the new position for the list
		// currentPos is the current position of the list
		if *position > currentPos {
			// Moving down: decrement positions of lists between old and new position
			// This query updates the positions of lists that are between the old and new position
			// It decrements their position by 1 to make room for the new position
			// the id must be different from the listID to avoid updating the same list
			// This is important to avoid conflicts and ensure that the list is moved correctly
			_, err = tx.Exec(`
                UPDATE lists 
                SET position = position - 1.0
                WHERE board_id = $1 AND position > $2 AND position <= $3 AND id != $4
            `, boardID, currentPos, *position, listID)
		} else if *position < currentPos {
			// Moving up: increment positions of lists between new and old position
			// This query updates the positions of lists that are between the new and old position
			// It increments their position by 1 to make room for the new position
			// the id must be different from the listID to avoid updating the same list
			// This is important to avoid conflicts and ensure that the list is moved correctly
			_, err = tx.Exec(`
                UPDATE lists 
                SET position = position + 1.0
                WHERE board_id = $1 AND position >= $2 AND position < $3 AND id != $4
            `, boardID, *position, currentPos, listID)
		}

		if err != nil {
			return nil, err
		}
	}

	// Update the list
	// This query updates the title and position of the list
	// It uses COALESCE to keep the current value if the new value is nil
	// COALESCE is a SQL function that returns the first non-null value in the list of arguments
	// In this case, it returns the new title or the current title if the new title is nil
	// It also updates the updated_at timestamp to the current time
	// This is important to keep track of when the list was last updated
	updateQuery := `
    UPDATE lists 
    SET title = COALESCE($1, title), 
        position = COALESCE($2, position),
        updated_at = NOW()
    WHERE id = $3
    RETURNING id, board_id, title, position, created_at, updated_at
    `

	// position is a pointer to an int, which allows us to pass a nil value
	// If position is nil, we pass nil to the query
	// posPtr is a pointer to the position variable
	// If position is nil, we pass nil to the query
	var posPtr *float64
	if position != nil {
		posPtr = position
	}

	// Execute the query and get the updated list
	var updatedList List
	err = tx.QueryRow(updateQuery, title, posPtr, listID).Scan(
		&updatedList.ID,
		&updatedList.BoardID,
		&updatedList.Title,
		&updatedList.Position,
		&updatedList.CreatedAt,
		&updatedList.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Commit the transaction
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &updatedList, nil
}

// DeleteList deletes a list
func DeleteList(listID, userID int64) error {
	// Check if user is a member of the board that owns this list
	memberCheck := `
    SELECT role FROM board_members 
    JOIN lists ON board_members.board_id = lists.board_id
    WHERE lists.id = $1 AND board_members.user_id = $2
    `
	var role string
	err := db.DB.QueryRow(memberCheck, listID, userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("not a member of the board that owns this list")
		}
		return err
	}

	// Start transaction
	// Begin a transaction to ensure that all operations are atomic
	// This means that either all operations succeed or none do
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}

	// defer tx.Rollback() is used to ensure that the transaction is rolled back if any error occurs
	// This is important to maintain data integrity and avoid partial updates
	defer tx.Rollback()

	// Get board ID and position for reordering
	var boardID int64
	var position float64

	// This query retrieves the board ID and position of the list
	// It uses the list ID to find the correct row in the lists table
	posQuery := `SELECT board_id, position FROM lists WHERE id = $1`
	err = tx.QueryRow(posQuery, listID).Scan(&boardID, &position)
	if err != nil {
		return err
	}

	// Delete the list
	// This query deletes the list from the lists table
	// It uses the list ID to find the correct row in the lists table
	_, err = tx.Exec(`DELETE FROM lists WHERE id = $1`, listID)
	if err != nil {
		return err
	}

	// Update positions of remaining lists
	// This query updates the positions of lists that are below the deleted list
	// It decrements their position by 1 to fill the gap left by the deleted list
	_, err = tx.Exec(`
        UPDATE lists 
        SET position = position - 1.0
        WHERE board_id = $1 AND position > $2
    `, boardID, position)
	if err != nil {
		return err
	}

	return tx.Commit()
}
