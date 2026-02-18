import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, UserService } from '@app/core/services';
import { AvatarComponent, BadgeComponent, Icon } from '@app/shared/components';
import { UserDto } from '@app/shared/models';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, Icon, BadgeComponent, AvatarComponent],
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

  protected readonly user = signal<UserDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly showDeleteModal = signal(false);
  // For image preview consistency with editor
  protected readonly currentImageUrl = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadUser(id);
    }

    if (this.route.snapshot.queryParamMap.get('saved')) {
      this.alertService.success('User saved successfully.');
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
    if (this.user()) {
      this.router.navigate(['/management/users/edit', this.user()!.id]);
    }
  }

  protected deleteUser() {
    if (!this.user()) {
      return;
    }

    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
  }

  protected confirmDelete() {
    if (!this.user()) {
      return;
    }

    const userId = this.user()!.id;

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.alertService.success('User deleted successfully');
        this.goBack();
      },
      error: (err) => {
        this.alertService.error(err.message);
      },
    });

    this.showDeleteModal.set(false);
  }
}
