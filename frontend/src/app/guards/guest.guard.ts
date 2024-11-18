import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const guestGuard = () => {
    const router = inject(Router);
    const authService = inject(AuthService);

    return authService.isAuthenticated$.pipe(
        take(1),
        map(isAuthenticated => {
            if (!isAuthenticated) {
                return true;
            }
            
            // Redirect to home if user is already authenticated
            router.navigate(['/']);
            return false;
        })
    );
};