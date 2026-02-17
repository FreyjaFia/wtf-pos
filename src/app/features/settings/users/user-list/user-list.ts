import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService, UserService } from '@core/services';
import {
  AvatarComponent,
  BadgeComponent,
  FilterDropdown,
  Icon,
  type FilterOption,
} from '@shared/components';
import { UserDto } from '@shared/models';
import { debounceTime } from 'rxjs';

type SortColumn = 'name' | 'username';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Icon,
    FilterDropdown,
    BadgeComponent,
    AvatarComponent,
  ],
  templateUrl: './user-list.html',
  host: { class: 'flex-1 min-h-0' },
})
export class UserListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  protected readonly users = signal<UserDto[]>([]);
  protected readonly usersCache = signal<UserDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isRefreshing = signal(false);

  protected readonly selectedStatuses = signal<string[]>(['active']);

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });

  protected readonly sortColumn = signal<SortColumn | null>('name');
  protected readonly sortDirection = signal<SortDirection>('asc');
  protected readonly showDeleteModal = signal(false);
  protected readonly userToDelete = signal<UserDto | null>(null);

  protected readonly statusCounts = computed(() => {
    const cache = this.usersCache();
    return {
      active: cache.filter((u) => u.isActive).length,
      inactive: cache.filter((u) => !u.isActive).length,
    };
  });

  protected readonly statusOptions = computed<FilterOption[]>(() => [
    { id: 'active', label: 'Active', count: this.statusCounts().active },
    { id: 'inactive', label: 'Inactive', count: this.statusCounts().inactive },
  ]);

  protected readonly sortedUsers = computed(() => {
    const users = [...this.users()];

    if (this.sortColumn() === 'name') {
      users.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        const comparison = nameA.localeCompare(nameB);
        return this.sortDirection() === 'asc' ? comparison : -comparison;
      });
    } else if (this.sortColumn() === 'username') {
      users.sort((a, b) => {
        const comparison = (a.username || '').localeCompare(b.username || '');
        return this.sortDirection() === 'asc' ? comparison : -comparison;
      });
    }

    return users;
  });

  ngOnInit() {
    this.loadUsers();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersToCache();
    });
  }

  protected loadUsers() {
    this.isLoading.set(true);

    this.userService.getUsers().subscribe({
      next: (data) => {
        this.usersCache.set(data);
        this.applyFiltersToCache();
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
    });
  }

  protected refresh() {
    this.isRefreshing.set(true);
    this.loadUsers();
  }

  private applyFiltersToCache() {
    const { searchTerm } = this.filterForm.value;
    let items = [...this.usersCache()];

    if (searchTerm && searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(
        (u) =>
          u.firstName.toLowerCase().includes(lowerSearch) ||
          u.lastName.toLowerCase().includes(lowerSearch) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(lowerSearch) ||
          u.username.toLowerCase().includes(lowerSearch),
      );
    }

    const selectedStatuses = this.selectedStatuses();
    if (selectedStatuses.length > 0) {
      items = items.filter((u) => {
        if (selectedStatuses.includes('active') && u.isActive) {
          return true;
        }
        if (selectedStatuses.includes('inactive') && !u.isActive) {
          return true;
        }
        return false;
      });
    }

    this.users.set(items);
  }

  protected navigateToEditor(userId?: string) {
    if (userId) {
      this.router.navigate(['/settings/users/edit', userId]);
    } else {
      this.router.navigate(['/settings/users/new']);
    }
  }

  protected navigateToDetails(userId: string) {
    this.router.navigate(['/settings/users/details', userId]);
  }

  protected deleteUser(user: UserDto) {
    this.userToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
    this.userToDelete.set(null);
  }

  protected confirmDelete() {
    const user = this.userToDelete();

    if (!user) {
      return;
    }

    this.showDeleteModal.set(false);
    this.userToDelete.set(null);

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        this.alertService.error(err.message);
      },
    });
  }

  protected toggleSort(column: SortColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  protected onStatusFilterChange(selectedIds: (string | number)[]) {
    this.selectedStatuses.set(selectedIds as string[]);
    this.applyFiltersToCache();
  }

  protected onStatusFilterReset() {
    this.selectedStatuses.set([]);
    this.applyFiltersToCache();
  }
}
