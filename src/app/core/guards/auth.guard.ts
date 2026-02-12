import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  // Check if token is valid
  if (auth.isTokenValid()) {
    return true;
  }

  // Token is expired or invalid, try to refresh
  const refreshToken = auth.getRefreshToken();

  if (refreshToken && !auth.isTokenValid()) {
    // Attempt to refresh the token
    return auth.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        // Refresh failed, redirect to login
        router.navigateByUrl('/login');
        return of(false);
      }),
    );
  }

  // No valid token and no refresh token, redirect to login
  router.navigateByUrl('/login');
  return false;
};
