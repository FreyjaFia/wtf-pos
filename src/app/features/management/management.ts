import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '@shared/components';

@Component({
  selector: 'app-management',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './management.html',
  host: { class: 'flex-1 min-h-0' },
})
export class ManagementComponent {
  private readonly router = inject(Router);

  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }
}
