import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { LoginDto } from '../../shared/models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private _isLoggedIn = new BehaviorSubject<boolean>(localStorage.getItem('loggedIn') === 'true');
  readonly isLoggedIn$ = this._isLoggedIn.asObservable();

  login(username: string, password: string): Observable<boolean> {
    if (!username || !password) {
      return throwError(() => new Error('Username and password are required'));
    }

    return this.http.post<LoginDto>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap((res) => {
        console.log('Login response:', res);
        if (res?.accessToken) {
          localStorage.setItem('token', res.accessToken);
          localStorage.setItem('loggedIn', 'true');
          this._isLoggedIn.next(true);
        }
      }),
      map((res) => {
        const hasToken = !!res?.accessToken;
        if (!hasToken) {
          console.warn('Login response missing accessToken:', res);
        }
        return hasToken;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login error:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);

        let errorMessage = 'Login failed. Please try again.';

        if (error.status === 401 || error.status === 400) {
          errorMessage = 'Invalid username or password.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    this._isLoggedIn.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return this._isLoggedIn.value || !!this.getToken();
  }
}
