import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services';
import { jwtDecode } from 'jwt-decode';
import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-header',
  imports: [CommonModule, AvatarComponent],
  templateUrl: './header.html',
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);

  protected readonly imageUrl: string | null;
  protected readonly userFullName: string;

  constructor() {
    const token = this.auth.getToken();
    let decoded: Record<string, unknown> | null = null;
    if (token) {
      try {
        decoded = jwtDecode(token);
      } catch {
        decoded = null;
      }
    }
    this.imageUrl = (decoded?.['image_url'] as string) || null;

    const givenName = (decoded?.['given_name'] as string) || '';
    const surname = (decoded?.['family_name'] as string) || '';

    this.userFullName = (givenName + ' ' + surname).trim() || 'User';
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
