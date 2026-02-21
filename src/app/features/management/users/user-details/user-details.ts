import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertService, AuthService, UserService } from '@app/core/services';
import { AvatarComponent, BadgeComponent, Icon } from '@app/shared/components';
import { UserDto, UserRoleEnum } from '@app/shared/models';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, RouterLink, Icon, BadgeComponent, AvatarComponent],
  templateUrl: './user-details.html',
  host: {
    class: 'block h-full',
  },
})
export class UserDetailsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);

  protected readonly user = signal<UserDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly showDeleteModal = signal(false);
  protected readonly isDeleting = signal(false);
  // For image preview consistency with editor
  protected readonly currentImageUrl = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadUser(id);
    }
  }

  private loadUser(id: string) {
    this.isLoading.set(true);

    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.currentImageUrl.set(user.imageUrl || null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected goBack() {
    this.router.navigate(['/management/users']);
  }

  protected navigateToEdit() {
    if (!this.canWriteManagement()) {
      this.alertService.errorUnauthorized();
      return;
    }

    if (this.user()) {
      this.router.navigate(['/management/users/edit', this.user()!.id]);
    }
  }

  protected deleteUser() {
    if (!this.canWriteManagement()) {
      this.alertService.errorUnauthorized();
      return;
    }

    if (!this.user()) {
      return;
    }

    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    if (this.isDeleting()) {
      return;
    }

    this.showDeleteModal.set(false);
  }

  protected confirmDelete() {
    if (this.isDeleting()) {
      return;
    }

    if (!this.canWriteManagement()) {
      this.alertService.errorUnauthorized();
      return;
    }

    if (!this.user()) {
      return;
    }

    const userId = this.user()!.id;
    this.isDeleting.set(true);

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.alertService.successDeleted('User');
        this.goBack();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.alertService.error(err.message);
      },
    });
  }

  protected canWriteManagement(): boolean {
    return this.authService.canWriteManagement();
  }

  protected getRoleLabel(user: UserDto): string {
    const enumName = UserRoleEnum[user.roleId];
    if (!enumName || typeof enumName !== 'string') {
      return 'Unknown';
    }
    return enumName.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  }
}
