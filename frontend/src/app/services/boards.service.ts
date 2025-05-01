import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { checkToken } from '@interceptors/token.interceptor';
import { Board } from '@models/board.model';
import { Card } from '@models/card.model';
import { BackgroundColorValue } from '@models/colors.model';
import { List } from '@models/list.model';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BoardsService {
  apiUrl = environment.API_URL;
  // We will create a constant to limit the buffer space of the board
  // based on Trello's API documentation the maximum size of a board is 65535 bytes
  // so we will use that value to limit the buffer space of the board
  bufferSpace = 65535;

  private http = inject(HttpClient);

  // Add a subject to track board changes
  private boardsUpdatedSource = new BehaviorSubject<boolean>(false);
  boardsUpdated$ = this.boardsUpdatedSource.asObservable();

  // Call this after creating, updating, or deleting a board
  notifyBoardsUpdated() {
    this.boardsUpdatedSource.next(true);
  }

  createBoard(title: string, backgroundColor: BackgroundColorValue) {
    return this.http
      .post<Board>(
        `${this.apiUrl}/boards`,
        {
          title,
          backgroundColor,
        },
        {
          context: checkToken(),
        },
      )
      .pipe(
        tap(() => {
          // Notify subscribers that boards list has changed
          this.notifyBoardsUpdated();
        }),
      );
  }

  getAllBoards() {
    return this.http.get<Board[]>(`${this.apiUrl}/boards`, {
      context: checkToken(),
    });
  }

  // Board['id'] is the same as string
  // We can use Board['id'] to make the code more readable and to avoid using string directly
  getBoard(id: Board['id']) {
    return this.http.get<Board>(`${this.apiUrl}/boards/${id}`, {
      context: checkToken(),
    });
  }

  deleteBoard(id: Board['id']) {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/boards/${id}`,
      { context: checkToken() },
    );
  }

  getPosition(cards: Card[], currentIndex: number) {
    // Let's create the algorithm to get the position of the card
    // We will use the currentIndex to get the position of the card in the array
    // if we only have one card we will return the same buffer space because that card is new
    if (cards.length === 1) {
      return this.bufferSpace;
    }
    // if we have more than one card we will check if the currentIndex is 0
    // if it is we will return the top position divided by 2 because that card is the first card in the array
    if (cards.length > 1 && currentIndex === 0) {
      // Get the position of previous card before making the movement to the top
      const onTopPosition = cards[1].position;
      return onTopPosition / 2;
    }

    // if we have more than one card and the currentIndex is between the first and last index
    // we will return average of top and bottom position related to a card, because that card is in the middle of the array
    const lastIndex = cards.length - 1;
    if (cards.length > 2 && currentIndex > 0 && currentIndex < lastIndex) {
      const prevPosition = cards[currentIndex - 1].position;
      const nextPosition = cards[currentIndex + 1].position;
      return (prevPosition + nextPosition) / 2;
    }

    // if we have more than one card and the currentIndex is the last index
    // we will return the bottom position plus the buffer space, because that card is the last card in the array
    if (cards.length > 1 && currentIndex === lastIndex) {
      // Get the position of previous card before making the movement to the bottom
      const onBottomPosition = cards[lastIndex - 1].position;
      return onBottomPosition + this.bufferSpace;
    }

    return 0;
  }

  getListPosition(lists: List[], currentIndex: number) {
    let position: number;

    if (currentIndex === 0) {
      // First position
      position = lists.length > 1 ? lists[1].position / 2 : this.bufferSpace;
      return position;
    } else if (currentIndex === lists.length - 1) {
      // Last position
      position = lists[currentIndex - 1].position + this.bufferSpace;
      return position;
    } else {
      // Between two lists
      position = (
        lists[currentIndex - 1].position +
        lists[currentIndex + 1].position
      ) / 2;
      return position;
    }
  }
}
