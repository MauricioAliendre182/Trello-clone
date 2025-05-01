import {
  HttpContext,
  HttpContextToken,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { TokenService } from '@services/token.service';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';

// Track refresh token operation state
// BehaviorSubject is a special type of observable that can emit values to its subscribers
// and can also store the last emitted value.
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

// This interceptor is used to add the access token to the request headers if the request has a context with CHECK_TOKEN set to true.
// The CHECK_TOKEN context is used to indicate that the request should include the access token.
const CHECK_TOKEN = new HttpContextToken<boolean>(() => false);

// This function is used to set the CHECK_TOKEN context for a request.
// It can be used in the request options when making an HTTP request to indicate that the request should include the access token.
export function checkToken() {
  return new HttpContext().set(CHECK_TOKEN, true);
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // IMPORTANT: The interceptor is the ideal place to make a request to my BE
  // to get a new access token if the access token is expired.

  // Add a context is a good practice to check the token only when needed.
  // This is useful for example when we want to check the token only for specific requests.

  // Check if the request has a context with CHECK_TOKEN set to true.
  // If it does, get the access token from the TokenService and add it to the Authorization header of the request.
  if (req.context.get(CHECK_TOKEN)) {
    const tokenService = inject(TokenService);
    // Check if the access token is valid
    const isValidToken = tokenService.isValidToken();
    if (isValidToken) {
      // Recover the access token
      const accessToken = tokenService.getToken();

      // If the request has a context with CHECK_TOKEN set to true, add the Authorization header
      // with the access token to the request.
      // We will clone the original request and set the Authorization header to avoid mutating the original request.
      // This is important because the original request may be used later in the application.
      const authRequest = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${accessToken}`),
      });
      return next(authRequest);
    } else {
      // If the access token is not valid, we will request a new refresh token
      const refreshToken = tokenService.getRefreshToken();
      // Then We will see if the refresh token is valid
      const isValidRefreshToken = tokenService.isValidRefreshToken();
      if (isValidRefreshToken && refreshToken) {
        // Handle concurrent refresh token requests
        if (!isRefreshing) {
          // Start the refresh process
          isRefreshing = true;
          refreshTokenSubject.next(null);

          // If the refresh token is valid, we will request a new access token
          // We will use the refresh token to get a new access token
          const authService = inject(AuthService);

          // Use exhaustMap here to ignore new refresh requests until the current one completes
          return (
            authService
              .refreshToken(refreshToken)
              // pipe() is used to chain multiple operators together
              // and to handle the response of the request.
              .pipe(
                // tap() is a RxJS operator that allows us to perform side effects
                // without modifying the original observable
                tap(() => {
                  // Reset the refreshing state and store the new token
                  isRefreshing = false;
                  refreshTokenSubject.next(tokenService.getToken());
                }),

                // switchMap() is used to switch to a new observable
                // and to return the new observable.
                // In this case to add the new access token to the request.
                switchMap(() => {
                  // Follow the logic to get the access token
                  const newAccessToken = tokenService.getToken();

                  // Clone the original request and set the Authorization header
                  const authRequest = req.clone({
                    headers: req.headers.set(
                      'Authorization',
                      `Bearer ${newAccessToken}`,
                    ),
                  });
                  return next(authRequest);
                }),
                catchError((error) => {
                  // Reset refresh state on error
                  isRefreshing = false;
                  refreshTokenSubject.next(null);

                  // Handle token refresh errors (e.g., logout the user)
                  tokenService.removeToken();
                  tokenService.removeRefreshToken();
                  return throwError(() => error);
                }),
              )
          );
        } else {
          // If a refresh is already in progress, wait for it to complete
          return refreshTokenSubject.pipe(
            // filter() is used to filter the emitted values of an observable
            // and to only emit the values that pass the filter.
            filter((token) => token !== null),
            // take(1) is used to take the first emitted value of an observable
            // and to complete the observable after that.
            take(1),
            switchMap((token) => {
              // Clone the original request with the new token
              const authRequest = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`),
              });
              return next(authRequest);
            }),
          );
        }
      }
    }
    // If we reach here, both tokens are invalid, proceed without auth header
    return next(req);
  }
  // No auth needed for this request
  return next(req);
};
