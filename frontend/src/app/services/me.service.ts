import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { checkToken } from '@interceptors/token.interceptor';
import { Board } from '@models/board.model';
import { User } from '@models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MeService {

  apiUrl = environment.API_URL;
  private http = inject(HttpClient);

  getMeProfile() {
    return this.http.get<User>(`${this.apiUrl}/me/profile`, {
      context: checkToken()
    });
  }

  getMyBoards() {
    return this.http.get<Board[]>(`${this.apiUrl}/me/boards`, {
      context: checkToken()
    });
  }


}
