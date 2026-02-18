import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment.development';
import { LoginDto, MeDto } from '@shared/models';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private _isLoggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  private readonly meRefreshSubject = new Subject<void>();
  readonly isLoggedIn$ = this._isLoggedIn.asObservable();
  readonly meRefresh$ = this.meRefreshSubject.asObservable();

  login(username: string, password: string): Observable<boolean> {
    if (!username || !password) {
      return throwError(() => new Error('Username and password are required'));
    }

    return this.http.post<LoginDto>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap((res) => {
        if (res?.accessToken) {
          localStorage.setItem('token', res.accessToken);

          if (res?.refreshToken) {
            localStorage.setItem('refreshToken', res.refreshToken);
          }

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

  getMe(): Observable<MeDto> {
    return this.http.get<MeDto>(`${this.baseUrl}/me`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Get me error:', error);

        const errorMessage =
          error.status === 401
            ? 'Unauthorized.'
            : error.status === 0
              ? 'Unable to connect to server. Please check your connection.'
              : 'Failed to fetch user profile.';

        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  notifyMeUpdated(): void {
    this.meRefreshSubject.next();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this._isLoggedIn.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Determines if the token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();

    if (!token) {
      return true;
    }

    try {
      const decoded = this.decodeToken(token);

      if (!decoded || !decoded['exp'] || typeof decoded['exp'] !== 'number') {
        return true;
      }

      const exp = decoded['exp'] as number;

      // Current time in seconds
      const currentTime = Math.floor(Date.now() / 1000);
      // Refresh token 5 minutes before expiration
      const expirationThreshold = exp - 5 * 60;

      return currentTime >= expirationThreshold;
    } catch {
      console.error('Error decoding token');
      return true;
    }
  }

  /**
   * Validates the current token
   * @returns true if token is valid and not expired
   */
  isTokenValid(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const decoded = this.decodeToken(token);

      if (!decoded || !decoded['exp'] || typeof decoded['exp'] !== 'number') {
        return false;
      }

      const exp = decoded['exp'] as number;
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime < exp;
    } catch {
      console.error('Error validating token');
      return false;
    }
  }

  /**
   * Refreshes the access token using the refresh token
   */
  refreshToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<{
        accessToken: string;
        refreshToken?: string;
      }>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          if (res?.accessToken) {
            localStorage.setItem('token', res.accessToken);

            if (res?.refreshToken) {
              localStorage.setItem('refreshToken', res.refreshToken);
            }

            this._isLoggedIn.next(true);
          }
        }),
        map((res) => !!res?.accessToken),
        catchError((error: HttpErrorResponse) => {
          console.error('Token refresh error:', error);
          // If refresh fails, logout the user
          this.logout();
          return throwError(() => new Error('Token refresh failed'));
        }),
      );
  }

  /**
   * Decodes a JWT token and returns its payload
   */
  private decodeToken(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this._isLoggedIn.value || !!this.getToken();
  }
}
