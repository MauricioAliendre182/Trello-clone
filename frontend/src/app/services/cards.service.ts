import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { checkToken } from '@interceptors/token.interceptor';
import { Card, CardDto } from '@models/card.model';
import { List } from '@models/list.model';

@Injectable({
  providedIn: 'root'
})
export class CardsService {
  apiUrl = environment.API_URL;
  private http = inject(HttpClient);

  // We will create a constant to limit the buffer space of the board
  // based on Trello's API documentation the maximum size of a board is 65535 bytes
  // so we will use that value to limit the buffer space of the board
  bufferSpace = 65535;

  create(id: List['id'], card: CardDto) {
    return this.http.post<Card>(`${this.apiUrl}/lists/${id}/cards`, card, {
      context: checkToken(),
    });
  }

  update(id: Card['id'], changes: CardDto) {
    return this.http.put<Card>(`${this.apiUrl}/cards/${id}`, changes, {
      context: checkToken(),
    });
  }

  delete(id: Card['id']) {
    return this.http.delete<{ message:string }>(`${this.apiUrl}/cards/${id}`, {
      context: checkToken(),
    });
  }


  getTheLastPosition(list: List) {
      // Calculate the position for the new card
      if (list.cards && list.cards.length > 0) {
        // If there are existing cards, position after the last one
        const position = list.cards[list.cards.length - 1].position + this.bufferSpace;
        return position;
      }

      return this.bufferSpace;
  }

}
