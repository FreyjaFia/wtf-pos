import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '@core/services';
import { FilterDropdown, Icon, type FilterOption } from '@shared/components';
import { ProductCategoryEnum, ProductDto } from '@shared/models';
import { debounceTime } from 'rxjs';

type SortColumn = 'name';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, ReactiveFormsModule, Icon, FilterDropdown],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
  host: {
    class: 'block h-full',
  },
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  protected readonly products = signal<ProductDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ProductCategoryEnum = ProductCategoryEnum;

  protected readonly selectedTypes = signal<number[]>([]);
  protected readonly selectedStatuses = signal<string[]>(['active']);

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });

  protected readonly sortColumn = signal<SortColumn | null>('name');
  protected readonly sortDirection = signal<SortDirection>('asc');

  protected readonly categoryCounts = computed(() => {
    const cache = this.products();
    return {
      [ProductCategoryEnum.Drink]: cache.filter((p) => p.category === ProductCategoryEnum.Drink).length,
      [ProductCategoryEnum.Food]: cache.filter((p) => p.category === ProductCategoryEnum.Food).length,
      [ProductCategoryEnum.Dessert]: cache.filter((p) => p.category === ProductCategoryEnum.Dessert).length,
      [ProductCategoryEnum.Other]: cache.filter((p) => p.category === ProductCategoryEnum.Other).length,
    };
  });

  protected readonly statusCounts = computed(() => {
    const cache = this.products();
    return {
      active: cache.filter((p) => p.isActive).length,
      inactive: cache.filter((p) => !p.isActive).length,
    };
  });

  protected readonly typeOptions = computed<FilterOption[]>(() => [
    { id: ProductCategoryEnum.Drink, label: 'Drink', count: this.categoryCounts()[ProductCategoryEnum.Drink] },
    { id: ProductCategoryEnum.Food, label: 'Food', count: this.categoryCounts()[ProductCategoryEnum.Food] },
    { id: ProductCategoryEnum.Dessert, label: 'Dessert', count: this.categoryCounts()[ProductCategoryEnum.Dessert] },
    { id: ProductCategoryEnum.Other, label: 'Other', count: this.categoryCounts()[ProductCategoryEnum.Other] },
  ]);

  protected readonly statusOptions = computed<FilterOption[]>(() => [
    { id: 'active', label: 'Active', count: this.statusCounts().active },
    { id: 'inactive', label: 'Inactive', count: this.statusCounts().inactive },
  ]);

  protected readonly sortedProducts = computed(() => {
    const products = [...this.products()];

    if (this.sortColumn() === 'name') {
      products.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return this.sortDirection() === 'asc' ? comparison : -comparison;
      });
    }

    return products;
  });

  ngOnInit() {
    this.loadProducts();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.loadProducts();
    });
  }

  protected loadProducts() {
    this.isLoading.set(true);
    this.error.set(null);

    const searchTerm = this.filterForm.value.searchTerm || null;
    const types = this.selectedTypes();
    const statuses = this.selectedStatuses();

    let category: ProductCategoryEnum | null = null;
    if (types.length === 1) {
      category = types[0] as ProductCategoryEnum;
    }

    let isActive: boolean | null = null;
    if (statuses.length === 1) {
      isActive = statuses[0] === 'active';
    }

    this.productService
      .getProducts({
        searchTerm,
        category,
        isActive,
      })
      .subscribe({
        next: (data) => {
          this.products.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        },
      });
  }

  protected navigateToEditor(productId?: string) {
    if (productId) {
      this.router.navigate(['/settings/products/edit', productId]);
    } else {
      this.router.navigate(['/settings/products/new']);
    }
  }

  protected navigateToDetails(productId: string) {
    this.router.navigate(['/settings/products/details', productId]);
  }

  protected deleteProduct(product: ProductDto) {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.loadProducts();
      },
      error: (err) => {
        this.error.set(err.message);
      },
    });
  }

  protected getProductCategoryName(category: ProductCategoryEnum): string {
    return ProductCategoryEnum[category];
  }

  protected toggleSort(column: SortColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  protected onTypeFilterChange(selectedIds: (string | number)[]) {
    this.selectedTypes.set(selectedIds as number[]);
    this.loadProducts();
  }

  protected onTypeFilterReset() {
    this.selectedTypes.set([]);
    this.loadProducts();
  }

  protected onStatusFilterChange(selectedIds: (string | number)[]) {
    this.selectedStatuses.set(selectedIds as string[]);
    this.loadProducts();
  }

  protected onStatusFilterReset() {
    this.selectedStatuses.set([]);
    this.loadProducts();
  }
}
