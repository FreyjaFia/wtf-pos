import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { Icon } from '../../../shared/components/icons/icon/icon';
import { ProductDto, ProductTypeEnum } from '../../../shared/models/product.models';

@Component({
  selector: 'app-new-order',
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './new-order.html',
  styleUrl: './new-order.css',
})
export class NewOrder implements OnInit {
  private readonly productService = inject(ProductService);

  protected readonly products = signal<ProductDto[]>([]);
  protected readonly productsCache = signal<ProductDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  private previousSearchTerm = '';

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
    filterDrink: new FormControl(false),
    filterFood: new FormControl(false),
  });

  ngOnInit() {
    this.loadProducts();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersToCache();
    });
  }

  loadProducts() {
    this.isLoading.set(true);
    this.error.set(null);

    const { searchTerm } = this.filterForm.value;

    this.productService
      .getProducts({
        page: 1,
        pageSize: 100,
        searchTerm: searchTerm || null,
        type: null,
        isActive: true,
      })
      .subscribe({
        next: (result) => {
          this.productsCache.set(result.products);
          this.applyFiltersToCache();
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load products');
          this.isLoading.set(false);
        },
      });
  }

  private applyFiltersToCache() {
    const { searchTerm, filterDrink, filterFood } = this.filterForm.value;

    const allowedTypes: ProductTypeEnum[] = [];
    if (filterDrink) {
      allowedTypes.push(ProductTypeEnum.Drink);
    }
    if (filterFood) {
      allowedTypes.push(ProductTypeEnum.Food);
    }

    let items = [...this.productsCache()];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(lowerSearchTerm));
    }

    if (allowedTypes.length > 0) {
      items = items.filter((p) => allowedTypes.includes(p.type));
    }

    this.products.set(items);
  }

  resetFilters() {
    this.filterForm.reset({
      searchTerm: '',
      filterDrink: false,
      filterFood: false,
    });
  }
}
