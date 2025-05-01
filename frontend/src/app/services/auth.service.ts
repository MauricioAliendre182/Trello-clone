import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { TokenService } from './token.service';
import { RefreshTokenResponse, ResponseLogin } from '@models/auth.model';
import { User } from '@models/user.model';
import { checkToken } from '@interceptors/token.interceptor';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  apiUrl = environment.API_URL;
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);

  // Let's create a user to store its state and recover it in other parts of the app
  user$ = new BehaviorSubject<User | null>(null);
  // The user$ observable will be used to store the user state

  constructor() {}

  login(email: string, password: string) {
    return (
      this.http
        .post<ResponseLogin>(`${this.apiUrl}/auth/login`, {
          email,
          password,
        })
        // We will create a pipe()
        // like an interceptor to save the token in the cookies
        // and set the token in the headers of the requests
        .pipe(
          // tap() is a RxJS operator that allows us to perform side effects
          // without modifying the original observable
          tap((response) => {
            // we will save the access and refresh token
            this.tokenService.saveToken(response.accessToken);
            this.tokenService.saveRefreshToken(response.refreshToken);
          }),
        )
    );
  }

  getDataUser() {
    // With this method we lose a bit of reactivity
    // because we will recover the user data without detecting changes (subscribe)
    // in this case can be used in my users table to recover the name of the user
    return this.user$.getValue();
  }

  refreshToken(refreshToken: string) {
    // This method will be used to refresh the token when it expires
    // We will use the refresh token to get a new access token
    return (
      this.http
        .post<RefreshTokenResponse>(`${this.apiUrl}/auth/refresh-token`, {
          refreshToken: refreshToken,
        })
        // We will create a pipe()
        // like an interceptor to save the new access token in the Cookies
        // and set the token in the headers of the requests
        .pipe(
          // tap() is a RxJS operator that allows us to perform side effects
          // without modifying the original observable
          tap((response) => {
            // we will save the access and refresh token
            this.tokenService.saveToken(response.accessToken);
            this.tokenService.saveRefreshToken(response.refreshToken);
          }),
        )
    );
  }

  register(name: string, email: string, password: string) {
    return this.http.post(`${this.apiUrl}/auth/signup`, {
      name,
      email,
      password,
    });
  }

  registerAndLogin(name: string, email: string, password: string) {
    return this.register(name, email, password).pipe(
      switchMap(() => {
        // If the response is correct I am going to login the user
        return this.login(email, password);
      }),
    );
  }

  // The response of this request is a boolean
  // indicating if the email is available or not
  isAvailable(email: string) {
    return this.http.post<{ isAvailable: boolean }>(
      `${this.apiUrl}/auth/is-available`,
      {
        email,
      },
    );
  }

  recovery(email: string) {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, {
      email,
    });
  }

  changePassword(token: string, newPassword: string) {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  getProfile() {
    // Here we will send the context to use the interceptor
    return this.http
      .get<User>(`${this.apiUrl}/auth/profile`, {
        context: checkToken(), // This is the context we will use to check the token
      })
      .pipe(
        // tap() is a RxJS operator that allows us to perform side effects
        // without modifying the original observable
        tap((user) => {
          this.user$.next(user);
        }),
      );
  }

  logout() {
    // Remove access and refresh token from Cookies
    this.tokenService.removeToken();
    this.tokenService.removeRefreshToken();
  }
}
