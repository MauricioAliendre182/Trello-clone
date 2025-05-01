package models

import (
	"database/sql"
	"errors"
	"maps182/api/db"
	"time"
)

// Card represents a card in a list
type Card struct {
	ID          int64     `json:"id"`
	ListID      int64     `json:"listId"`
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
	Position    float64   `json:"position"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// GetCardsByListID retrieves all cards for a list
func GetCardsByListID(listID, userID int64) ([]Card, error) {
	// First check if user is a member of the board that owns this list
	// This is important to ensure that the user has access to the cards
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

	// Get cards
	// This query retrieves all cards for the specified list
	// It orders them by position to maintain the order in which they should be displayed
	query := `
    SELECT id, list_id, title, description, position, created_at, updated_at
    FROM cards
    WHERE list_id = $1
    ORDER BY position
    `

	rows, err := db.DB.Query(query, listID)
	if err != nil {
		return nil, err
	}

	// defer rows.Close() is used to ensure that the rows are closed after we are done with them
	// This is important to prevent memory leaks and to free up resources
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var card Card
		err := rows.Scan(
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
		cards = append(cards, card)
	}

	return cards, nil
}

// CreateCard creates a new card in a list
// *Card is a pointer to a Card struct, which allows us to return a nil value if the card creation fails
// This is useful for avoiding unnecessary memory allocation and copying of data
// position is a pointer to an float64, which allows us to pass a nil value
func CreateCard(listID, userID int64, title, description string, position *float64) (*Card, error) {
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

	// Start a transaction for consistency
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Determine position
	var cardPosition float64
	if position == nil {
		// If no position provided
		// Get the maximum position
		// This query retrieves the maximum position of cards in the specified list
		// If there are no cards, it returns -1, so the new card will be at position 0
		// COALESCE is a SQL function that returns the first non-null value in the list of arguments
		// In this case, it returns the maximum position or -1 if there are no cards
		posQuery := `
		SELECT COALESCE(MAX(position), -1.0) + 1.0 FROM cards WHERE list_id = $1
		`
		err = db.DB.QueryRow(posQuery, listID).Scan(&cardPosition)
		if err != nil {
			return nil, err
		}
	} else {
		// Use the provided position
		cardPosition = *position

		// Shift existing cards to make room
		_, err = tx.Exec(`
        UPDATE cards 
        SET position = $2
        WHERE list_id = $1
        `, listID, cardPosition)

		if err != nil {
			return nil, err
		}
	}

	// Create the card
	// This query inserts a new card into the cards table
	// It uses the values provided in the function arguments and the calculated position
	query := `
    INSERT INTO cards (list_id, title, description, position)
    VALUES ($1, $2, $3, $4)
    RETURNING id, list_id, title, description, position, created_at, updated_at
    `

	var card Card
	err = db.DB.QueryRow(query, listID, title, description, position).Scan(
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

	// Commit the transaction
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// It returns the created card
	// this is the pointer to the card struct
	// This allows the caller to modify the card without creating a copy of it
	return &card, nil
}

// UpdateCard updates a card
// listID is a pointer to an int64, which allows us to pass a nil value
// position is a pointer to an float64, which allows us to pass a nil value
// This is useful for optional parameters that may not be provided by the caller
func UpdateCard(cardID, userID int64, title, description string, listID *int64, position *float64) (*Card, error) {
	// Check if user is a member of the board that owns this card
	// This query checks if the user is a member of the board that owns the card
	// It joins the board_members, lists, and cards tables to find the board ID
	// that owns the card
	// If the user is not a member, it returns an error
	memberCheck := `
    SELECT board_members.board_id FROM board_members 
    JOIN lists ON board_members.board_id = lists.board_id
    JOIN cards ON lists.id = cards.list_id
    WHERE cards.id = $1 AND board_members.user_id = $2
    `
	var boardID int64
	err := db.DB.QueryRow(memberCheck, cardID, userID).Scan(&boardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("not a member of the board that owns this card")
		}
		return nil, err
	}

	// Start transaction
	// Begin a transaction to ensure that all database operations are atomic
	// This means that either all operations succeed or none do
	// This is important for maintaining data integrity
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}

	// defer tx.Rollback() is used to ensure that the transaction is rolled back
	// if any error occurs during the transaction
	defer tx.Rollback()

	// Get current card info
	var currentListID int64
	var currentPos float64

	// This query retrieves the current list ID and position of the card
	// It is used to determine if the card is being moved to a new list or just reordered
	cardQuery := `SELECT list_id, position FROM cards WHERE id = $1`
	err = tx.QueryRow(cardQuery, cardID).Scan(&currentListID, &currentPos)
	if err != nil {
		return nil, err
	}

	// Handle list change and/or position change
	newListID := currentListID
	// if listID is nil, we don't want to change the list
	// if listID is not nil, we want to change the list
	if listID != nil {
		// newListID is a pointer to an int64, so we need to dereference it to get the value
		// This is important to avoid nil pointer dereference errors
		// dereference means to access the value that the pointer points to
		// In this case, we are getting the new list ID from the pointer
		newListID = *listID

		// Check if the new list belongs to the same board
		// This query checks if the new list ID belongs to the same board as the card
		listBoardCheck := `SELECT board_id FROM lists WHERE id = $1`
		var newListBoardID int64
		err = tx.QueryRow(listBoardCheck, newListID).Scan(&newListBoardID)
		if err != nil {
			return nil, err
		}

		if boardID != newListBoardID {
			return nil, errors.New("cannot move card to a list on another board")
		}

		// Moving to a new list
		// If the new list ID is different from the current list ID, we need to update the positions of the cards
		// in both the current list and the new list
		if newListID != currentListID {
			// Get max position in the new list
			if position == nil {
				var maxPos float64
				// This query retrieves the maximum position of cards in the new list
				// If there are no cards, it returns -1, so the new card will be at position 0
				posQuery := `SELECT COALESCE(MAX(position), -1.0) + 1.0 FROM cards WHERE list_id = $1`
				err = tx.QueryRow(posQuery, newListID).Scan(&maxPos)
				if err != nil {
					return nil, err
				}
				// position is a pointer to an int, so we need to dereference it to get the value
				// This is important to avoid nil pointer dereference errors
				position = &maxPos
			}

			// Update positions in the old list
			// This query updates the positions of cards in the current list
			// It decrements the position of cards that are below the current card's position
			_, err = tx.Exec(`
                UPDATE cards 
                SET position = position - 1.0
                WHERE list_id = $1 AND position > $2
            `, currentListID, currentPos)
			if err != nil {
				return nil, err
			}

			// Update positions in the new list to make room
			// This query updates the positions of cards in the new list
			// It increments the position of cards that are at or above the new position
			_, err = tx.Exec(`
                UPDATE cards 
                SET position = position + 1.0
                WHERE list_id = $1 AND position >= $2
            `, newListID, *position)
			if err != nil {
				return nil, err
			}
			// if the new list ID is the same as the current list ID, we need to reorder the cards
			// This is important to maintain the order of cards in the list
			// Condtion is to check if the position is not nil and different from the current position
			// This means that the card is being moved to a different position in the same list
		} else if position != nil && *position != currentPos {
			// Same list, just reordering
			if *position > currentPos {
				// Moving down
				// This query updates the positions of cards in the current list
				// It decrements the position of cards that are between the current position and the new position
				// the id must be different from the cardID to avoid updating the same card
				// This is important to avoid updating the same card and causing a conflict
				_, err = tx.Exec(`
                    UPDATE cards 
                    SET position = position - 1.0
                    WHERE list_id = $1 AND position > $2 AND position <= $3 AND id != $4
                `, currentListID, currentPos, *position, cardID)
			} else {
				// Moving up
				// This query updates the positions of cards in the current list
				// It increments the position of cards that are between the new position and the current position
				// the id must be different from the cardID to avoid updating the same card
				// This is important to avoid updating the same card and causing a conflict
				_, err = tx.Exec(`
                    UPDATE cards 
                    SET position = position + 1.0
                    WHERE list_id = $1 AND position >= $2 AND position < $3 AND id != $4
                `, currentListID, *position, currentPos, cardID)
			}
			if err != nil {
				return nil, err
			}
		}
	}

	// Update the card
	// This query updates the card with the new values provided in the function arguments
	// It uses COALESCE to set the values to the current values if they are nil
	updateQuery := `
    UPDATE cards 
    SET title = COALESCE($1, title), 
        description = COALESCE($2, description),
        list_id = COALESCE($3, list_id),
        position = COALESCE($4, position),
        updated_at = NOW()
    WHERE id = $5
	RETURNING id, list_id, title, description, position, created_at, updated_at
    `

	var posPtr *float64
	if position != nil {
		posPtr = position
	}

	var updatedCard Card
	err = tx.QueryRow(updateQuery,
		nullIfEmpty(title),
		nullIfEmpty(description),
		nullIfZero(newListID),
		posPtr,
		cardID,
	).Scan(
		&updatedCard.ID,
		&updatedCard.ListID,
		&updatedCard.Title,
		&updatedCard.Description,
		&updatedCard.Position,
		&updatedCard.CreatedAt,
		&updatedCard.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Commit the transaction
	// This is important to ensure that all operations are saved to the database
	// If any error occurs, the transaction is rolled back to maintain data integrity
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &updatedCard, nil
}

// Helper functions for NULL handling
// interface{} or any is used to allow nil values to be passed
// to the database query
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullIfZero(i int64) any {
	if i == 0 {
		return nil
	}
	return i
}

// DeleteCard deletes a card
func DeleteCard(cardID, userID int64) error {
	// Check if user is a member of the board that owns this card
	// This query checks if the user is a member of the board that owns the card
	// It joins the board_members, lists, and cards tables to find the board ID
	// that owns the card
	// If the user is not a member, it returns an error
	memberCheck := `
    SELECT cards.list_id, cards.position FROM board_members 
    JOIN lists ON board_members.board_id = lists.board_id
    JOIN cards ON lists.id = cards.list_id
    WHERE cards.id = $1 AND board_members.user_id = $2
    `
	var listID int64
	var position float64
	err := db.DB.QueryRow(memberCheck, cardID, userID).Scan(&listID, &position)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("not a member of the board that owns this card")
		}
		return err
	}

	// Start transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete the card
	_, err = tx.Exec(`DELETE FROM cards WHERE id = $1`, cardID)
	if err != nil {
		return err
	}

	// Update positions of remaining cards
	// This query updates the positions of cards in the list
	// It decrements the position of cards that are below the deleted card's position
	// the id must be different from the cardID to avoid updating the same card
	_, err = tx.Exec(`
        UPDATE cards 
        SET position = position - 1.0
        WHERE list_id = $1 AND position > $2
    `, listID, position)
	if err != nil {
		return err
	}

	// Commit the transaction
	// This is important to ensure that all operations are saved to the database
	// If any error occurs, the transaction is rolled back to maintain data integrity
	return tx.Commit()
}
