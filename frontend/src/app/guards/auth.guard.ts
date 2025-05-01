import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // I need to check if the is valid
  // I will use the refresh token in my guard
  // If for example, the refresh token expired I will be redirected to login
  const isValidToken = tokenService.isValidRefreshToken();
  if (!isValidToken) {
    // If the token does not exist, I need to redirect the user to the login page
    router.navigate(['/login']);
    return false;
  }

  return true;
};
