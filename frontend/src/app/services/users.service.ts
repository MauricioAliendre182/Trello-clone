import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { User } from '@models/user.model';
import { checkToken } from '@interceptors/token.interceptor';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  apiUrl = environment.API_URL;
  private http = inject(HttpClient);

  constructor() {}

  getUsers() {
    // Here we will send the context to use the interceptorconst token = this.tokenService.getToken();
    return this.http.get<User[]>(`${this.apiUrl}/users`, {
      context: checkToken(), // This is the context we will use to check the token
    });
  }

}
