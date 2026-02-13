import { CommonModule, Location } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@core/services';
import { AlertComponent, BadgeComponent, Icon } from '@shared/components';
import { ProductCategoryEnum, ProductDto, ProductSimpleDto, ProductTypeEnum } from '@shared/models';

@Component({
  selector: 'app-product-details',
  imports: [CommonModule, Icon, BadgeComponent, AlertComponent],
  templateUrl: './product-details.html',
  host: {
    class: 'block h-full',
  },
})
export class ProductDetailsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly product = signal<ProductDto | null>(null);
  protected readonly addOns = signal<ProductSimpleDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showError = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showSuccess = signal(false);
  protected readonly ProductTypeEnum = ProductTypeEnum;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadProduct(id);
    }

    if (this.route.snapshot.queryParamMap.get('saved')) {
      this.successMessage.set('Product saved successfully.');
      this.showSuccess.set(true);
    }
  }

  private loadProduct(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.showError.set(false);

    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);

        // Load add-ons for this product
        this.productService.getProductAddOns(id).subscribe({
          next: (addOns) => {
            this.addOns.set(addOns);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Failed to load add-ons:', err);
            // Still show product even if add-ons fail to load
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err.message);
        this.showError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected hideSuccess() {
    this.showSuccess.set(false);
  }

  protected hideError() {
    this.showError.set(false);
  }

  protected goBack() {
    this.location.back();
  }

  protected navigateToEdit() {
    if (this.product()) {
      this.router.navigate(['/settings/products/edit', this.product()!.id]);
    }
  }

  protected deleteProduct() {
    if (!this.product()) {
      return;
    }

    const productId = this.product()!.id;
    const confirmed = window.confirm('Are you sure you want to delete this product?');

    if (!confirmed) {
      return;
    }

    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.router.navigateByUrl('/settings/products');
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to delete product');
        this.showError.set(true);
      },
    });
  }

  protected getProductCategoryName(category: ProductCategoryEnum): string {
    return ProductCategoryEnum[category];
  }
}
