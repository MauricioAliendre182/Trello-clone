package routes

import (
	"log"
	"maps182/api/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// getUserBoards retrieves all boards for the currently authenticated user
func getUserBoards(context *gin.Context) {
	// Get the authenticated user ID from the context
	// userId comes from the Authenticate middleware
	// This is how we can pass data between middleware and request handlers
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get boards for the user
	boards, err := models.GetBoardsByUserID(userIDInt64)
	if err != nil {
		log.Printf("Error retrieving boards: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not retrieve boards.",
		})
		return
	}

	context.JSON(http.StatusOK, boards)
}

// createBoard creates a new board
func createBoard(context *gin.Context) {
	// Get the authenticated user ID from the context
	// userId comes from the Authenticate middleware
	// This is how we can pass data between middleware and request handlers
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	var boardRequest struct {
		Title           string `json:"title" binding:"required"`
		BackgroundColor string `json:"backgroundColor"`
	}

	if err := context.ShouldBindJSON(&boardRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Create the board
	board, err := models.CreateBoard(userIDInt64, boardRequest.Title, boardRequest.BackgroundColor)
	if err != nil {
		log.Printf("Error creating board: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not create board.",
		})
		return
	}

	context.JSON(http.StatusCreated, board)
}

// getBoard retrieves a specific board
func getBoard(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get board ID from path parameter
	boardIDStr := context.Param("id")
	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid board ID.",
		})
		return
	}

	// Get the board with members
	board, err := models.GetBoardWithMembersListsAndCards(boardID, userIDInt64)
	if err != nil {
		log.Printf("Error retrieving board: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "board not found" {
			status = http.StatusNotFound
		}
		if err.Error() == "not a member of this board" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, board)
}

// updateBoard updates a board
func updateBoard(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get board ID from path parameter
	boardIDStr := context.Param("id")
	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid board ID.",
		})
		return
	}

	var boardRequest struct {
		Title           string `json:"title"`
		BackgroundColor string `json:"backgroundColor"`
	}

	if err := context.ShouldBindJSON(&boardRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Update the board
	err = models.UpdateBoard(boardID, userIDInt64, boardRequest.Title, boardRequest.BackgroundColor)
	if err != nil {
		log.Printf("Error updating board: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of this board" || err.Error() == "insufficient permissions" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Board updated successfully.",
	})
}

// deleteBoard deletes a board
func deleteBoard(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get board ID from path parameter
	boardIDStr := context.Param("id")
	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid board ID.",
		})
		return
	}

	// Delete the board
	err = models.DeleteBoard(boardID, userIDInt64)
	if err != nil {
		log.Printf("Error deleting board: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of this board" || err.Error() == "only the owner can delete a board" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Board deleted successfully.",
	})
}

// addBoardMember adds a new member to a board
func addBoardMember(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get board ID from path parameter
	boardIDStr := context.Param("id")
	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid board ID.",
		})
		return
	}

	var memberRequest struct {
		Email string `json:"email" binding:"required"`
		Role  string `json:"role"`
	}

	if err := context.ShouldBindJSON(&memberRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Find the user by email
	user, err := models.GetUserByEmail(memberRequest.Email)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{
			"message": "User not found.",
		})
		return
	}

	// Add the user to the board
	err = models.AddMember(boardID, userIDInt64, user.ID, memberRequest.Role)
	if err != nil {
		log.Printf("Error adding member to board: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of this board" || err.Error() == "insufficient permissions" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Member added successfully.",
	})
}

// List routes
func getLists(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get board ID from path parameter
	boardIDStr := context.Param("id")
	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid board ID.",
		})
		return
	}

	// Get lists for the board
	lists, err := models.GetListsByBoardID(boardID, userIDInt64)
	if err != nil {
		log.Printf("Error retrieving lists: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of this board" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	// Get cards for each list
	for i := range lists {
		cards, err := models.GetCardsByListID(lists[i].ID, userIDInt64)
		if err != nil {
			log.Printf("Error retrieving cards: %v", err)
			// Handle specific errors
			context.JSON(http.StatusInternalServerError, gin.H{
				"message": "Could not retrieve cards.",
			})
			return
		}
		lists[i].Cards = cards
	}

	context.JSON(http.StatusOK, lists)
}

func createList(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get board ID from path parameter
	boardIDStr := context.Param("id")
	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid board ID.",
		})
		return
	}

	var listRequest struct {
		Title    string   `json:"title" binding:"required"`
		Position *float64 `json:"position"`
	}

	if err := context.ShouldBindJSON(&listRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Create the list
	list, err := models.CreateList(boardID, userIDInt64, listRequest.Title, listRequest.Position)
	if err != nil {
		log.Printf("Error creating list: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of this board" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusCreated, list)
}

func updateList(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get list ID from path parameter
	listIDStr := context.Param("id")
	listID, err := strconv.ParseInt(listIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid list ID.",
		})
		return
	}

	var listRequest struct {
		Title    string   `json:"title"`
		Position *float64 `json:"position"`
	}

	if err := context.ShouldBindJSON(&listRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Update the list
	updatedList, err := models.UpdateList(listID, userIDInt64, listRequest.Title, listRequest.Position)
	if err != nil {
		log.Printf("Error updating list: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of the board that owns this list" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, updatedList)
}

func deleteList(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get list ID from path parameter
	listIDStr := context.Param("id")
	listID, err := strconv.ParseInt(listIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid list ID.",
		})
		return
	}

	// Delete the list
	err = models.DeleteList(listID, userIDInt64)
	if err != nil {
		log.Printf("Error deleting list: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of the board that owns this list" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "List deleted successfully.",
	})
}

// Card routes
func createCard(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get list ID from path parameter
	listIDStr := context.Param("id")
	listID, err := strconv.ParseInt(listIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid list ID.",
		})
		return
	}

	var cardRequest struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description"`
		Position    *float64 `json:"position"`
	}

	if err := context.ShouldBindJSON(&cardRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Create the card
	card, err := models.CreateCard(listID, userIDInt64, cardRequest.Title, cardRequest.Description, cardRequest.Position)
	if err != nil {
		log.Printf("Error creating card: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of the board that owns this list" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusCreated, card)
}

func updateCard(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get card ID from path parameter
	cardIDStr := context.Param("id")
	cardID, err := strconv.ParseInt(cardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid card ID.",
		})
		return
	}

	var cardRequest struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		ListID      *int64   `json:"listId"`
		Position    *float64 `json:"position"`
	}

	if err := context.ShouldBindJSON(&cardRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request format.",
		})
		return
	}

	// Update the card
	updatedCard, err := models.UpdateCard(cardID, userIDInt64, cardRequest.Title, cardRequest.Description,
		cardRequest.ListID, cardRequest.Position)
	if err != nil {
		log.Printf("Error updating card: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of the board that owns this card" ||
			err.Error() == "cannot move card to a list on another board" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, updatedCard)
}

func deleteCard(context *gin.Context) {
	// Get the authenticated user ID from the context
	userID, _ := context.Get("userId")
	userIDInt64 := userID.(int64)

	// Get card ID from path parameter
	cardIDStr := context.Param("id")
	cardID, err := strconv.ParseInt(cardIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid card ID.",
		})
		return
	}

	// Delete the card
	err = models.DeleteCard(cardID, userIDInt64)
	if err != nil {
		log.Printf("Error deleting card: %v", err)
		// Handle specific errors
		status := http.StatusInternalServerError
		if err.Error() == "not a member of the board that owns this card" {
			status = http.StatusForbidden
		}
		context.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Card deleted successfully.",
	})
}
