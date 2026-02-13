import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '@core/services';
import { ProductDto, ProductTypeEnum } from '@shared/models';
import { Icon } from '@shared/components';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, ReactiveFormsModule, Icon],
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
  protected readonly ProductTypeEnum = ProductTypeEnum;

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
    type: new FormControl<ProductTypeEnum | null>(null),
    isAddOn: new FormControl<boolean | null>(null),
    isActive: new FormControl<boolean | null>(true),
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

    const filters = this.filterForm.value;

    this.productService
      .getProducts({
        searchTerm: filters.searchTerm || null,
        type: filters.type || null,
        isAddOn: filters.isAddOn,
        isActive: filters.isActive,
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

  protected getProductTypeName(type: ProductTypeEnum): string {
    return ProductTypeEnum[type];
  }

  protected clearFilters() {
    this.filterForm.reset({
      searchTerm: '',
      type: null,
      isAddOn: null,
      isActive: true,
    });
  }
}
