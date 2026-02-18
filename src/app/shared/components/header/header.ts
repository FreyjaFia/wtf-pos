import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '@core/services';
import { jwtDecode } from 'jwt-decode';
import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-header',
  imports: [CommonModule, AvatarComponent],
  templateUrl: './header.html',
})
export class Header implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);

  protected readonly imageUrl: string | null;
  protected readonly userFullName: string;
  protected readonly now = signal(new Date());
  protected readonly isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;
  private routeSubscription?: { unsubscribe: () => void };
  private readonly onOnline = () => this.isOnline.set(true);
  private readonly onOffline = () => this.isOnline.set(false);

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

  ngOnInit() {
    this.clockIntervalId = setInterval(() => {
      this.now.set(new Date());
    }, 1000);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    this.routeSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.closeDropdownFocus();
      }
    });
  }

  ngOnDestroy() {
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    this.routeSubscription?.unsubscribe();
  }

  protected goToMyProfile(event?: Event) {
    event?.preventDefault();
    this.closeDropdownFocus();
    this.router.navigateByUrl('/my-profile');
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private closeDropdownFocus() {
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement) {
      activeEl.blur();
    }
  }
}
