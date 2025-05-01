import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { checkToken } from '@interceptors/token.interceptor';
import { Board } from '@models/board.model';
import { List, ListDto } from '@models/list.model';

@Injectable({
  providedIn: 'root',
})
export class ListsService {
  apiUrl = environment.API_URL;
  private http = inject(HttpClient);

  // We will create a constant to limit the buffer space of the board
  // based on Trello's API documentation the maximum size of a board is 65535 bytes
  // so we will use that value to limit the buffer space of the board
  bufferSpace = 65535;

  create(id: Board['id'], list: ListDto) {
    return this.http.post<List>(
      `${this.apiUrl}/boards/${id}/lists`,
      list,
      {
        context: checkToken(),
      },
    );
  }

  update(listId: List['id'], list: ListDto) {
    return this.http.put<List>(
      `${this.apiUrl}/lists/${listId}`,
      list,
      {
        context: checkToken(),
      }
    );
  }

  delete(listId: List['id']) {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/lists/${listId}`,
      {
        context: checkToken(),
      }
    );
  }

  getTheLastPosition(lists: List[]) {
    // Calculate the position for the new card
    if (lists && lists.length > 0) {
      // If there are existing lists, position after the last one
      const position = lists[lists.length - 1].position + this.bufferSpace;
      return position;
    }

    return this.bufferSpace;
}
}
