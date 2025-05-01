import { inject, Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { jwtDecode, JwtPayload } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly _cookieService = inject(CookieService);

  constructor() { }

  // We can store the token in localstorage, but it is a best practice to store it
  // in a Cookie
  // But we can use a cookie or any other storage method
  // for Cookies we will use the ngx-cookie-service package
  saveToken(token: string) {
    this._cookieService.set('token-trello', token, 1, '/'); // 1 day expiration and path '/'
  }

  getToken() {
    return this._cookieService.get('token-trello');
  }

  removeToken() {
    this._cookieService.delete('token-trello', '/'); // delete the token cookie
  }

  // Store the refresh token in a Cookie
  saveRefreshToken(token: string) {
    this._cookieService.set('refresh-token-trello', token, 1, '/'); // 1 day expiration and path '/'
  }

  getRefreshToken() {
    return this._cookieService.get('refresh-token-trello');
  }

  removeRefreshToken() {
    this._cookieService.delete('refresh-token-trello', '/'); // delete the token cookie
  }


  isValidToken() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // This is a simple check, we can use a library like jwt-decode to decode the token and check the expiration date
    // For now, we will just check if the token is not expired
    const decodeToken = jwtDecode<JwtPayload>(token);

    if (decodeToken && decodeToken?.exp) {
      // I wll get the date of my token
      const tokenDate = new Date(0);
      tokenDate.setUTCSeconds(decodeToken.exp);

      // Let's compare the date of the token with the current date
      const currentDate = new Date();

      return tokenDate.getTime() > currentDate.getTime(); // If the token date is greater than the current date, the token is valid
    }

    return false
  }

  // Check if refresh token is valid
  isValidRefreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    // This is a simple check, we can use a library like jwt-decode to decode the token and check the expiration date
    // For now, we will just check if the token is not expired
    const decodeToken = jwtDecode<JwtPayload>(refreshToken);

    if (decodeToken && decodeToken?.exp) {
      // I wll get the date of my token
      const tokenDate = new Date(0);
      tokenDate.setUTCSeconds(decodeToken.exp);

      // Let's compare the date of the token with the current date
      const currentDate = new Date();

      return tokenDate.getTime() > currentDate.getTime(); // If the token date is greater than the current date, the token is valid
    }

    return false

  }
}
