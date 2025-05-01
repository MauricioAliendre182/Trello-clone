import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';

export const redirectGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // I need to check if the token is valid
  // I will use the refresh token in my guard
  // If the token exists, I need to redirect the user to the app page
  const isValidToken = tokenService.isValidRefreshToken();
  if (isValidToken) {
    router.navigate(['/app']);
  }

  return true;
};
