import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService, CustomerService } from '@core/services';
import { BadgeComponent, FilterDropdown, Icon, type FilterOption } from '@shared/components';
import { CustomerDto } from '@shared/models';
import { debounceTime } from 'rxjs';

type SortColumn = 'name' | 'address';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-customer-list',
  imports: [CommonModule, ReactiveFormsModule, Icon, FilterDropdown, BadgeComponent],
  templateUrl: './customer-list.html',
  host: { class: 'flex-1 min-h-0' },
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  protected readonly customers = signal<CustomerDto[]>([]);
  protected readonly customersCache = signal<CustomerDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isRefreshing = signal(false);

  protected readonly selectedStatuses = signal<string[]>(['active']);

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });

  protected readonly sortColumn = signal<SortColumn | null>('name');
  protected readonly sortDirection = signal<SortDirection>('asc');
  protected readonly showDeleteModal = signal(false);
  protected readonly customerToDelete = signal<CustomerDto | null>(null);

  protected readonly statusCounts = computed(() => {
    const cache = this.customersCache();
    return {
      active: cache.filter((c) => c.isActive).length,
      inactive: cache.filter((c) => !c.isActive).length,
    };
  });

  protected readonly statusOptions = computed<FilterOption[]>(() => [
    { id: 'active', label: 'Active', count: this.statusCounts().active },
    { id: 'inactive', label: 'Inactive', count: this.statusCounts().inactive },
  ]);

  protected readonly sortedCustomers = computed(() => {
    const customers = [...this.customers()];

    if (this.sortColumn() === 'name') {
      customers.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        const comparison = nameA.localeCompare(nameB);
        return this.sortDirection() === 'asc' ? comparison : -comparison;
      });
    } else if (this.sortColumn() === 'address') {
      customers.sort((a, b) => {
        const comparison = (a.address || '').localeCompare(b.address || '');
        return this.sortDirection() === 'asc' ? comparison : -comparison;
      });
    }

    return customers;
  });

  ngOnInit() {
    this.loadCustomers();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersToCache();
    });
  }

  protected loadCustomers() {
    this.isLoading.set(true);

    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customersCache.set(data);
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
    this.loadCustomers();
  }

  private applyFiltersToCache() {
    const { searchTerm } = this.filterForm.value;
    let items = [...this.customersCache()];

    if (searchTerm && searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(
        (c) =>
          c.firstName.toLowerCase().includes(lowerSearch) ||
          c.lastName.toLowerCase().includes(lowerSearch) ||
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowerSearch),
      );
    }

    const selectedStatuses = this.selectedStatuses();
    if (selectedStatuses.length > 0) {
      items = items.filter((c) => {
        if (selectedStatuses.includes('active') && c.isActive) {
          return true;
        }
        if (selectedStatuses.includes('inactive') && !c.isActive) {
          return true;
        }
        return false;
      });
    }

    this.customers.set(items);
  }

  protected navigateToEditor(customerId?: string) {
    if (customerId) {
      this.router.navigate(['/settings/customers/edit', customerId]);
    } else {
      this.router.navigate(['/settings/customers/new']);
    }
  }

  protected navigateToDetails(customerId: string) {
    this.router.navigate(['/settings/customers/details', customerId]);
  }

  protected deleteCustomer(customer: CustomerDto) {
    this.customerToDelete.set(customer);
    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
    this.customerToDelete.set(null);
  }

  protected confirmDelete() {
    const customer = this.customerToDelete();

    if (!customer) {
      return;
    }

    this.showDeleteModal.set(false);
    this.customerToDelete.set(null);

    this.customerService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.loadCustomers();
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
