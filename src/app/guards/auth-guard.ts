import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    if (loggedIn) return true;
    return router.parseUrl('/login');
};