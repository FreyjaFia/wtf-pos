import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
})
export class Home {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
