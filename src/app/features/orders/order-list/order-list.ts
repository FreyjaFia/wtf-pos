import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OrderService } from '@core/services';
import { AlertComponent, FilterDropdown, Icon, type FilterOption } from '@shared/components';
import { OrderDto, OrderStatusEnum } from '@shared/models';
import { debounceTime } from 'rxjs';

type SortColumn = 'orderNumber' | 'date';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-order-list',
  imports: [CommonModule, ReactiveFormsModule, Icon, AlertComponent, FilterDropdown],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderList implements OnInit {
  private readonly orderService = inject(OrderService);

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });

  protected readonly orders = signal<OrderDto[]>([]);
  protected readonly ordersCache = signal<OrderDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isRefreshing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showError = signal(false);
  protected readonly OrderStatusEnum = OrderStatusEnum;
  protected readonly sortColumn = signal<SortColumn | null>(null);
  protected readonly sortDirection = signal<SortDirection>('desc');

  protected readonly selectedStatuses = signal<OrderStatusEnum[]>([]);

  protected readonly statusCounts = computed(() => {
    const cache = this.ordersCache();
    return {
      [OrderStatusEnum.All]: cache.length,
      [OrderStatusEnum.Pending]: cache.filter((o) => o.status === OrderStatusEnum.Pending).length,
      [OrderStatusEnum.Completed]: cache.filter((o) => o.status === OrderStatusEnum.Completed)
        .length,
      [OrderStatusEnum.Cancelled]: cache.filter((o) => o.status === OrderStatusEnum.Cancelled)
        .length,
    };
  });

  protected readonly filterOptions = computed<FilterOption[]>(() => [
    {
      id: OrderStatusEnum.Pending,
      label: 'Pending',
      count: this.statusCounts()[OrderStatusEnum.Pending],
      colorClass: 'text-warning',
    },
    {
      id: OrderStatusEnum.Completed,
      label: 'Completed',
      count: this.statusCounts()[OrderStatusEnum.Completed],
      colorClass: 'text-success',
    },
    {
      id: OrderStatusEnum.Cancelled,
      label: 'Cancelled',
      count: this.statusCounts()[OrderStatusEnum.Cancelled],
      colorClass: 'text-error',
    },
  ]);

  ngOnInit() {
    this.loadOrders();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersToCache();
    });
  }

  loadOrders() {
    this.isLoading.set(true);
    this.error.set(null);
    this.showError.set(false);

    this.orderService.getOrders().subscribe({
      next: (result) => {
        this.ordersCache.set(result);
        this.applyFiltersToCache();
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load orders');
        this.showError.set(true);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
    });
  }

  refresh() {
    this.isRefreshing.set(true);
    this.loadOrders();
  }

  onStatusFilterChange(selectedIds: (string | number)[]) {
    this.selectedStatuses.set(selectedIds as OrderStatusEnum[]);
    this.applyFiltersToCache();
  }

  onStatusFilterReset() {
    this.selectedStatuses.set([]);
    this.applyFiltersToCache();
  }

  toggleSort(column: SortColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.applyFiltersToCache();
  }

  resetFilters() {
    this.filterForm.reset({
      searchTerm: '',
    });
    this.selectedStatuses.set([]);
    this.applyFiltersToCache();
  }

  hideError() {
    this.showError.set(false);
  }

  getStatusClass(status: OrderStatusEnum): string {
    switch (status) {
      case OrderStatusEnum.Pending:
        return 'badge-warning';
      case OrderStatusEnum.Completed:
        return 'badge-success';
      case OrderStatusEnum.Cancelled:
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  getStatusLabel(status: OrderStatusEnum): string {
    switch (status) {
      case OrderStatusEnum.Pending:
        return 'Pending';
      case OrderStatusEnum.Completed:
        return 'Completed';
      case OrderStatusEnum.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getOrderDate(order: OrderDto): string {
    return order.updatedAt || order.createdAt;
  }

  getItemsText(count: number): string {
    return count === 1 ? '1 item' : `${count} items`;
  }

  private applyFiltersToCache() {
    const { searchTerm } = this.filterForm.value;

    let items = [...this.ordersCache()];

    // Filter by search term
    if (searchTerm && searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(
        (order) =>
          order.orderNumber.toString().includes(lowerSearch) ||
          order.id.toLowerCase().includes(lowerSearch),
      );
    }

    // Filter by status
    const selectedStatuses = this.selectedStatuses();
    if (selectedStatuses.length > 0) {
      items = items.filter((order) => selectedStatuses.includes(order.status));
    }

    // Sort
    const sortColumn = this.sortColumn();
    const sortDirection = this.sortDirection();

    if (sortColumn === 'orderNumber') {
      items.sort((a, b) =>
        sortDirection === 'asc' ? a.orderNumber - b.orderNumber : b.orderNumber - a.orderNumber,
      );
    } else if (sortColumn === 'date') {
      items.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else {
      // Default sort by date descending
      items.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
    }

    this.orders.set(items);
  }
}
