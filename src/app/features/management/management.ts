import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services';
import { Icon } from '@shared/components';

@Component({
  selector: 'app-management',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './management.html',
  host: { class: 'flex-1 min-h-0' },
})
export class ManagementComponent {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  canReadCustomers(): boolean {
    return this.authService.canReadCustomers();
  }
}

