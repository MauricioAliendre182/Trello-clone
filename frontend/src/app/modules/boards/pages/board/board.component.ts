import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavbarComponent } from '../../../layout/components/navbar/navbar.component';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBox,
  faWaveSquare,
  faPlus,
  faImage,
  faAngleRight,
  faUsers,
  faGear,
  faAngleDown,
  faTableList,
  faCalendarDays,
  faStar,
  faLock,
  faTimes,
  faTrash,
  faPencil,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { faTrello } from '@fortawesome/free-brands-svg-icons';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { Dialog } from '@angular/cdk/dialog';
import {
  CardDialogComponent,
  CardDialogResult,
} from '../../components/todo-dialog/card-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { BoardsService } from '@services/boards.service';
import { Board } from '@models/board.model';
import { Card } from '@models/card.model';
import { List } from '@models/list.model';
import { RecentBoardsService } from '@services/recent-boards.service';
import { AuthService } from '@services/auth.service';
import { User } from '@models/user.model';
import { CardsService } from '@services/cards.service';
import { FormsModule } from '@angular/forms';
import { RequestStatus } from '@models/request-status.model';
import { ListsService } from '@services/lists.service';
import { BoardStateService } from '@services/board-state.service';

@Component({
  selector: 'app-board',
  imports: [
    CommonModule,
    NavbarComponent,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    FontAwesomeModule,
    BtnComponent,
    FormsModule,
  ],
  templateUrl: './board.component.html',
  // We need to add some styles to the component
  // to add some animations to the drag and drop feature
  styles: [
    `
      /* Animate items as they're being sorted. */
      .cdk-drag-animating {
        transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
      }

      /* Animate an item that has been dropped. */
      .cdk-drop-list-dragging .cdk-drag {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class BoardComponent implements OnInit {
  //iconos
  faTrello = faTrello;
  faBox = faBox;
  faWaveSquare = faWaveSquare;
  faPlus = faPlus;
  faImage = faImage;
  faAngleRight = faAngleRight;
  faUsers = faUsers;
  faGear = faGear;
  faAngleDown = faAngleDown;
  faTableList = faTableList;
  faCalendarDays = faCalendarDays;
  faStar = faStar;
  faLock = faLock;
  faTimes = faTimes;
  faTrash = faTrash;
  faPencil = faPencil;
  faClock = faClock;

  // Board variable
  // The board can be null because the API will not respond
  // inmediately, so we need to set it to null
  // and then set it to the data from the API
  board: Board | null = null;

  // User variable
  // We need user info here
  user: User | null = null;

  // Set the status for the button
  status: RequestStatus = 'init';

  // Show list variable
  showListForm: boolean = false;

  // Create a card properties to store the card data
  // cardTextarea is a reference to the textarea element in the template
  // We will use it to focus the textarea when we create a new card
  activeListId: number | null = null;
  newCardTitle: string = '';
  activeList: List | null = null;
  @ViewChild('cardTextarea') cardTextarea!: ElementRef;

  // Create a list properties
  newListTitle: string = '';
  editingListId: number | null = null;
  editedListTitle: string = '';
  @ViewChild('listTextarea') listTextarea!: ElementRef;

  // Inject activate route module
  // This module is used to get the current route and its parameters
  // This is useful to get the id of the board we are working on
  // and to get the data from the board
  private route = inject(ActivatedRoute);

  // Inject the boards service module
  private boardsService = inject(BoardsService);

  // Inject the recent boards service module
  private recentBoardsService = inject(RecentBoardsService);

  // Inject the auth service module
  private authService = inject(AuthService);

  // Inject the card service module
  private cardsService = inject(CardsService);

  // Inject lists service module
  private listsService = inject(ListsService);

  // Inject board state service module
  private boardStateService = inject(BoardStateService);

  // Inject dialog module
  constructor(private dialog: Dialog) {}

  ngOnInit(): void {
    // Here we will get the id of the board from the route
    // and we will use it to get the data from the board
    // the name in app.routes.ts is :boardId
    this.route.params.subscribe((params) => {
      const id = params['boardId'];

      if (id) {
        // Here we will get the data from the board
        this.getBoard(id);

        // Update board ID in state service
        this.boardStateService.setBoardId(id);
      }
    });

    this.authService.user$.subscribe((user) => {
      this.user = user;
    });
  }

  getConnectedListIds(): string[] {
    if (!this.board?.lists) {
      return [];
    }
    // Return an array of all list IDs as strings
    return this.board.lists.map(list => list.id.toString());
  }

  // Function that listen to the drop event
  // the event is of type CdkDragDrop
  // CdkDrapDrop is a generic type that can be used to specify the type of the items being dragged
  // and the type of the container they are being dropped into
  // Here we are expectiong a ToDO list
  drop(event: CdkDragDrop<Card[]>) {
    // From $event we need currentIndex and previousIndex
    // to know its position
    // moeItemInArray is a helper function that takes an array and the previousIndex and currentIndex
    // and moves the item in the array, in this case the list of todos
    // IMPORTANT: Here we need to distinguish between the three arrays (three columns)
    // to transfer between columns we need to see that the event.previousContainer.data
    // and the event.container.data are different, for that we will use transferArrayItem
    if (event.previousContainer === event.container) {
      // event.container.data tells me what is the data to be moved in the container
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // Get the position of the cards in the list
      const position = this.boardsService.getPosition(
        event.container.data,
        event.currentIndex,
      );

      // Let's select the card that we are updating
      const card = event.container.data[event.currentIndex];

      // We can know the id of the list with events
      // As we configured the [id] as list.id in the template
      // we can get the id of the list with event.container.id
      const listId = Number.isNaN(parseInt(event.container.id, 10))
      ? card.listId // Fallback to original list ID
      : parseInt(event.container.id, 10);

      // Update the card position
      this.updateCard(card, position, listId);
    } else {
      // Different list - transfer the item between arrays
      transferArrayItem(
        // transferArrayItem is a helper function that takes the previousContainer.data
        // container.data, the previousIndex and the currentIndex
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // Get the position of the cards in the list
      const position = this.boardsService.getPosition(
        event.container.data,
        event.currentIndex,
      );

      // Let's select the card that we are updating
      const card = event.container.data[event.currentIndex];

      // We can know the id of the list with events
      // As we configured the [id] as list.id in the template
      // we can get the id of the list with event.container.id
      const listId = Number.isNaN(parseInt(event.container.id, 10))
        ? card.listId // Fallback to original list ID
        : parseInt(event.container.id, 10);

      // Update the position of the card
      // We need to update the card in the API
      this.updateCard(card, position, listId);
    }
  }

  // Event to add a new list
  addList() {
    if (!this.newListTitle.trim()) return;

    // Set loading status
    this.status = 'loading';

    // Calculate the position for the new list
    // If the board is empty, we can use the buffer space as the position
    const lists = this.board?.lists || [];
    const position = this.listsService.getTheLastPosition(lists); // Default position for first list

    this.listsService
      .create(this.board!.id, {
        title: this.newListTitle.trim(),
        position: position,
      })
      .subscribe({
        next: (newList) => {
          // Initialize cards array
          newList.cards = [];

          // Add to board lists
          if (this.board) {
            this.board.lists.push(newList);
          }

          // Reset form
          this.newListTitle = '';
          this.showListForm = false;
          this.status = 'success';
        },
        error: (error) => {
          this.status = 'failed';
          console.error('Error creating list:', error);
          alert('Error creating list. Please try again.');
        },
      });
  }

  // Add this method to handle list drops
  dropList(event: CdkDragDrop<List[]>) {
    if (event.previousIndex === event.currentIndex) return;

    // Update the array in UI first (optimistic update)
    moveItemInArray(this.board!.lists, event.previousIndex, event.currentIndex);

    // Calculate new position similar to cards
    const lists = this.board!.lists;

    const position = this.boardsService.getListPosition(
      lists,
      event.currentIndex,
    );

    // Get the moved list
    const movedList = lists[event.currentIndex];

    // Update the list with new position
    this.listsService
      .update(movedList.id, {
        title: movedList.title,
        position: position,
      })
      .subscribe({
        next: (updatedList) => {
          console.log('List position updated', updatedList);
        },
        error: (error) => {
          console.error('Error updating list position', error);
          // Revert the array to its previous state if there's an error
          moveItemInArray(
            this.board!.lists,
            event.currentIndex,
            event.previousIndex,
          );
        },
      });
  }

  // Add to your BoardComponent class
  toggleListActions(list: List) {
    if (!list.hasOwnProperty('showActions')) {
      Object.defineProperty(list, 'showActions', {
        value: false,
        writable: true,
        enumerable: true,
      });
    }
    list.showActions = !list.showActions;
  }

  // Optional helper method
  isListActionsVisible(list: List): boolean {
    return list.hasOwnProperty('showActions') && (list as any).showActions === true;
  }

  addCard(list: List) {
    this.activeListId = list.id;
    this.activeList = list;
    this.newCardTitle = '';

    // Focus the textarea after a brief delay (to allow rendering)
    setTimeout(() => {
      if (this.cardTextarea) {
        // focus() is a method that sets the focus on the textarea element
        // this.cardTextarea.nativeElement.focus() is used to set the focus on the textarea element
        this.cardTextarea.nativeElement.focus();
      }
    }, 100);
  }

  confirmAddCard(list: List) {
    if (!this.newCardTitle.trim()) return;

    // Set the status to loading
    this.status = 'loading';

    // Calculate the position for the new card
    // If the list is empty, we can use the buffer space as the position
    const position = this.cardsService.getTheLastPosition(list);

    // Create the card via service
    this.cardsService
      .create(list.id, {
        // We need to pass the id of the list to the backend
        title: this.newCardTitle.trim(),
        description: '',
        position: position,
      })
      .subscribe({
        next: (newCard) => {
          // Set the status to success
          this.status = 'success';

          // Add the card to the list if not automatically done by your backend
          if (!list.cards) {
            list.cards = [];
          }
          list.cards.push(newCard);

          // Reset the form
          this.cancelAddCard();
        },
        error: (error) => {
          // Set the status to failed
          this.status = 'failed';

          console.error('Error creating card:', error);
          alert('Error creating card. Please try again.');
        },
      });
  }

  cancelAddCard() {
    this.activeListId = null;
    this.activeList = null;
    this.newCardTitle = '';
  }

  // Start list title editing
  editListTitle(list: List) {
    this.editingListId = list.id;
    this.editedListTitle = list.title;

    // Focus the input after rendering
    setTimeout(() => {
      const editInput = document.getElementById(`list-title-${list.id}`);
      if (editInput) {
        editInput.focus();
      }
    }, 100);
  }

  // Save edited list title
  saveListTitle(list: List) {
    if (!this.editedListTitle.trim() || this.editedListTitle === list.title) {
      this.cancelListEdit();
      return;
    }

    this.listsService
      .update(list.id, {
        title: this.editedListTitle.trim(),
        position: list.position,
      })
      .subscribe({
        next: (updatedList) => {
          // Update list in the UI
          const index = this.board!.lists.findIndex((l) => l.id === list.id);
          if (index !== -1) {
            this.board!.lists[index].title = updatedList.title;
          }
          this.cancelListEdit();
        },
        error: (error) => {
          console.error('Error updating list:', error);
          alert('Error updating list. Please try again.');
        },
      });
  }

  // Cancel list edit
  cancelListEdit() {
    this.editingListId = null;
    this.editedListTitle = '';
  }

  // Event to open the dialog
  openDialog(card: Card, list: List) {
    // To receive newly information from a dialog/modal, we need to store
    // the instace of this openDialog method
    // Here we are sending our component called TodoDialogComponent
    // to the dialog service
    const dialogRef = this.dialog.open<CardDialogResult>(CardDialogComponent, {
      // Here we will configure some options at the moment to open the modal/dialog
      minWidth: '760px',
      maxWidth: '50%',
      // With data we can send information to the modal
      // It can be an array, object, etc.
      data: {
        card: card,
        listTitle: list.title,
      },
    });

    // let's subscribe to the close event
    // to know when the dialog is closed
    dialogRef.closed.subscribe((output) => {
      if (output) {
        if (output.action === 'updated') {
          // Update card in the UI
          const updatedCard = output.card;
          const cardIndex = list.cards.findIndex(
            (c) => c.id === updatedCard!.id,
          );
          if (cardIndex !== -1) {
            list.cards[cardIndex] = updatedCard!;
          }
        } else if (output.action === 'deleted') {
          // Remove card from the UI
          const cardId = output.cardId;
          const cardIndex = list.cards.findIndex((c) => c.id === cardId);
          if (cardIndex !== -1) {
            list.cards.splice(cardIndex, 1);
          }
        }
      }
    });
  }

  private getBoard(id: string) {
    this.boardsService.getBoard(id).subscribe((board) => {
      // Ensure all lists have a cards array
      if (board && board.lists) {
        board.lists = board.lists.map((list) => ({
          ...list,
          cards: list.cards || [], // Ensure cards is at least an empty array
        }));
      }

      // Here we will get the data from the board
      this.board = board;

      // Update board info in state service
      if (board) {
        const backgroundColor = this.getBoardBackgroundClassNav();
        this.boardStateService.updateBoardInfo(
          board.id.toString(),
          board.title,
          backgroundColor
        );
      }

      // Add to recent boards when viewed
      this.recentBoardsService.addBoard(board);
    });
  }

  private updateCard(card: Card, position: number, listId: number) {
    this.cardsService
      .update(card.id, {
        title: card.title,
        description: card.description,
        listId: listId,
        position: position,
      })
      .subscribe((cardUpdated) => {
        // Here we will get the data from the card
        console.log(cardUpdated);
      });
  }

  // method to get the background color of the board
  getBoardBackgroundClass(): string {
    if (!this.board || !this.board.backgroundColor) {
      return 'bg-azteca'; // Default background
    }

    // Return the appropriate class based on board.backgroundColor
    switch (this.board.backgroundColor) {
      case 'sky':
        return 'bg-sky-700';
      case 'green':
        return 'bg-green-700';
      case 'yellow':
        return 'bg-yellow-700';
      case 'red':
        return 'bg-red-700';
      case 'violet':
        return 'bg-violet-700';
      case 'gray':
        return 'bg-gray-700';
      default:
        return 'bg-gray-700';
    }
  }

  // method to get the background color of the nav
  getBoardBackgroundClassNav(): string {
    if (!this.board || !this.board.backgroundColor) {
      return 'bg-azteca border-gray-800'; // Default background
    }

    // Return the appropriate class based on board.backgroundColor
    switch (this.board.backgroundColor) {
      case 'sky':
        return 'bg-sky-800 border-sky-800';
      case 'green':
        return 'bg-green-800 border-green-800';
      case 'yellow':
        return 'bg-yellow-800 border-yellow-800';
      case 'red':
        return 'bg-red-800 border-red-800';
      case 'violet':
        return 'bg-violet-800 border-violet-800';
      case 'gray':
        return 'bg-gray-800 border-gray-800'
      default:
        return 'bg-gray-800 border-gray-800';
    }
  }

  // Delete a list
  deleteList(list: List) {
    if (
      confirm(
        `Are you sure you want to delete the list "${list.title}" and all its cards?`,
      )
    ) {
      this.listsService.delete(list.id).subscribe({
        next: () => {
          // Remove list from UI
          if (this.board) {
            this.board.lists = this.board.lists.filter((l) => l.id !== list.id);
          }
        },
        error: (error) => {
          console.error('Error deleting list:', error);
          alert('Error deleting list. Please try again.');
        },
      });
    }
  }
}
