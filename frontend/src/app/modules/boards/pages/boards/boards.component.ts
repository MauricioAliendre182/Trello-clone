import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CdkAccordionModule } from '@angular/cdk/accordion';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBox,
  faWaveSquare,
  faClock,
  faAngleUp,
  faAngleDown,
  faHeart,
  faBorderAll,
  faUsers,
  faGear,
  faPlus,
  faTimes,
  faEllipsisH
} from '@fortawesome/free-solid-svg-icons';
import { faTrello } from '@fortawesome/free-brands-svg-icons';
import { Router, RouterLinkWithHref } from '@angular/router';
import { MeService } from '@services/me.service';
import { Board } from '@models/board.model';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { FormsModule } from '@angular/forms';
import { BoardsService } from '@services/boards.service';
import { CardColorComponent } from '../../../shared/components/card-color/card-color.component';
import { RecentBoardsService } from '@services/recent-boards.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { AuthService } from '@services/auth.service';
import { User } from '@models/user.model';
import { BACKGROUND_COLORS, BackgroundColorValue } from '@models/colors.model';

@Component({
  selector: 'app-boards',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    CdkAccordionModule,
    RouterLinkWithHref,
    OverlayModule,
    CdkOverlayOrigin,
    CdkConnectedOverlay,
    FormsModule,
    CardColorComponent,
    DialogModule
  ],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.css',
})
export class BoardsComponent implements OnInit {
  //iconos
  faTrello = faTrello;
  faBox = faBox;
  faWaveSquare = faWaveSquare;
  faClock = faClock;
  faAngleUp = faAngleUp;
  faAngleDown = faAngleDown;
  faHeart = faHeart;
  faBorderAll = faBorderAll;
  faUsers = faUsers;
  faGear = faGear;
  faPlus = faPlus;
  faTimes = faTimes;
  faEllipsisH = faEllipsisH;

  // Inject the services to get the necessary data
  private boardsService = inject(BoardsService);
  private recentBoardsService = inject(RecentBoardsService);
  private meService = inject(MeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Create board menu
  isCreateBoardMenuOpen = false;
  newBoardTitle = '';
  selectedBackground: BackgroundColorValue = 'sky'; // Default blue background

  // Add these properties to your BoardsComponent class
  titleMinLength = 3; // Minimum title length
  titleError: string | null = null; // To store validation error message

  // Delete a board properties
  isBoardMenuOpen = false;
  currentBoardMenuTrigger: any;
  currentBoard: Board | null = null;
  boardToDelete: Board | null = null;

  // Inject dialog module
  constructor(
    private dialog: Dialog
  ) { }

  // Background options for new boards
  boardBackgrounds = BACKGROUND_COLORS;

  // Overlay positioning
  overlayPositions: ConnectedPosition[] = [
    {
      originX: 'start',     // Must be literally 'start', 'center', or 'end'
      originY: 'top',    // Must be literally 'top', 'center', or 'bottom'
      overlayX: 'start',    // Must be literally 'start', 'center', or 'end'
      overlayY: 'top',      // Must be literally 'top', 'center', or 'bottom'
      offsetY: 8            // This is fine as a number
    }
  ];

  // ViewChild to get the template reference for the delete confirmation dialog
  // This will be used to open the dialog when the user wants to delete a board
  // We will use the Angular CDK Dialog module to create a confirmation dialog
  // Our template variable in this case is deleteConfirmationDialog
  @ViewChild('deleteConfirmationDialog') deleteConfirmationTemplate!: TemplateRef<any>;

  boardMenuPositions: ConnectedPosition[] = [
    {
      originX: 'end',       // Align with right edge of button
      originY: 'bottom',    // Start from bottom of button
      overlayX: 'end',      // Align with right edge of overlay
      overlayY: 'top',      // Position overlay below button
      offsetY: 4            // Small spacing
    }
  ];

  // boards to be used in the template
  boards: Board[] = [];
  recentBoards: Board[] = [];

  // User variable
  // We need user info here
  user: User | null = null;

  // We will call this component in our ngOnInit lifecycle hook
  ngOnInit(): void {
    // Generate all the boards of the user
    // And load the recent viewed boards
    this.getMyBoards();
    this.loadRecentBoards();

    // Get the user info from the auth service
    this.authService.user$
    .subscribe(user => {
      this.user = user
    })

    // Subscribe to board updates
    this.boardsService.boardsUpdated$.subscribe(updated => {
      if (updated) {
        this.getMyBoards(); // Refresh boards when notified
      }
    });
  }

  getMyBoards() {
    this.meService.getMyBoards().subscribe({
      // We will use the next method to get the boards of the user
      next: (boards) => {
        this.boards = boards || []; // Ensure it's never null
      },
      error: (error) => {
        console.error('Error fetching boards', error);
        this.boards = []; // Set to empty array on error
      }
    });
  }

  private loadRecentBoards() {
    this.recentBoardsService.recentBoards$.subscribe(boards => {
      this.recentBoards = boards;
    });
  }

  toggleCreateBoardMenu() {
    this.isCreateBoardMenuOpen = !this.isCreateBoardMenuOpen;
    this.newBoardTitle = '';
    this.selectedBackground = 'sky'; // Reset to default background color
    this.titleError = null; // Reset error message
  }

  createBoard() {
      // Run validation
      if (!this.validateTitle(this.newBoardTitle)) {
        return;
      }

    // Call the service to create a new board
    // Pass the selected background color and the title of the new board
    this.boardsService
      .createBoard(this.newBoardTitle.trim(), this.selectedBackground)
      .subscribe({
        next: (createdBoard) => {
          // Add to boards array
          this.boards.push(createdBoard)

          // Also add to recent boards
          this.recentBoardsService.addBoard(createdBoard);

          // Reset and close menu
          this.newBoardTitle = '';
          this.isCreateBoardMenuOpen = false;

          // Navigate to the new board
          this.router.navigate(['/app/boards', createdBoard.id]);
        },
        error: (error) => {
          console.error('Error creating board', error);
        },
      });
  }

  // Add a validation method
  validateTitle(title: string): boolean {
    if (!title || title.trim().length === 0) {
      this.titleError = 'Board title is required';
      return false;
    }
    if (title.trim().length < this.titleMinLength) {
      this.titleError = `Board title must be at least ${this.titleMinLength} characters long`;
      return false;
    }
    this.titleError = null;
    return true;
  }

  // Methods to delete a board
  // trigger is the trigger element for the overlay
  // board is the board to be deleted
  toggleBoardMenu(board: Board, trigger: CdkOverlayOrigin) {
    this.currentBoard = board;
    this.currentBoardMenuTrigger = trigger;
    this.isBoardMenuOpen = !this.isBoardMenuOpen;
  }

  closeBoardMenu() {
    this.isBoardMenuOpen = false;
    this.currentBoard = null;
  }

  showDeleteBoardConfirmation(board: Board | null) {
    if (!board) return;
    this.boardToDelete = board;
    this.isBoardMenuOpen = false;

    const dialogRef = this.dialog.open(this.deleteConfirmationTemplate, {
      ariaLabel: 'Delete Board Confirmation'
    });

    dialogRef.closed.subscribe(() => {
      this.boardToDelete = null;
    });
  }

  cancelDeleteBoard() {
    this.dialog.closeAll();
  }

  confirmDeleteBoard() {
    if (!this.boardToDelete) return;

    const boardId = this.boardToDelete.id;

    this.boardsService.deleteBoard(boardId).subscribe({
      next: () => {
        // Remove from boards list
        this.boards = this.boards.filter(board => board.id !== boardId);

        // Remove from recent boards if present
        this.recentBoards = this.recentBoards.filter(board => board.id !== boardId);

        // Also remove the board from the recent boards service
        this.recentBoardsService.clearBoard(boardId);

        this.dialog.closeAll();
      },
      error: (err) => {
        console.error('Error deleting board:', err);
        // Show error notification if needed
      }
    });
  }
}
