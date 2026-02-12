import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert/alert';
import { Icon } from '../../shared/components/icons/icon/icon';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon, AlertComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected loading = false;
  protected errorMessage = signal('');
  protected showError = signal(false);

  protected readonly loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  ngOnInit() {
    this.checkExistingSession();
  }

  /**
   * Check if user has a valid token or refresh token on page load
   * If valid, redirect to home. If expired, try to refresh and redirect.
   */
  private checkExistingSession() {
    // Check if token is already valid
    if (this.auth.isTokenValid()) {
      this.router.navigateByUrl('/home');
      return;
    }

    // Check if we have a refresh token and try to refresh
    const refreshToken = this.auth.getRefreshToken();

    if (refreshToken) {
      this.auth
        .refreshToken()
        .pipe(timeout(30000))
        .subscribe({
          next: (ok) => {
            if (ok) {
              // Token refreshed successfully, redirect to home
              this.router.navigateByUrl('/home');
            }
          },
          error: (err) => {
            // Refresh failed or expired, stay on login
            console.log('Refresh token expired or invalid', err);
          },
        });
    }
  }

  login() {
    const { username, password } = this.loginForm.value;

    this.loading = true;
    this.errorMessage.set('');
    this.showError.set(false);

    this.auth
      .login(username!, password!)
      .pipe(
        timeout(30000),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (ok) => {
          if (ok) {
            this.router.navigateByUrl('/home');
          } else {
            console.log('ok but error');
            this.errorMessage.set('Login failed. Invalid response from server.');
            this.showError.set(true);
          }
        },
        error: (err) => {
          console.log('error');
          if (err.name === 'TimeoutError') {
            this.errorMessage.set('Login request timed out. Please try again.');
          } else {
            this.errorMessage.set(err.message || 'Login failed. Please try again.');
          }
          this.showError.set(true);
        },
      });
  }

  hideError() {
    this.showError.set(false);
  }
}
