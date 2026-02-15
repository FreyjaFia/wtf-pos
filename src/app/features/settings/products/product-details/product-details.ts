import { CommonModule, Location } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, ProductService } from '@core/services';
import {
  BadgeComponent,
  Icon,
  PriceHistoryDrawerComponent,
} from '@shared/components';
import {
  ProductCategoryEnum,
  ProductDto,
  ProductPriceHistoryDto,
  ProductSimpleDto,
} from '@shared/models';

@Component({
  selector: 'app-product-details',
  imports: [CommonModule, Icon, BadgeComponent, PriceHistoryDrawerComponent],
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
  private readonly alertService = inject(AlertService);

  protected readonly product = signal<ProductDto | null>(null);
  protected readonly addOns = signal<ProductSimpleDto[]>([]);
  protected readonly linkedProducts = signal<ProductSimpleDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isHistoryOpen = signal(false);
  protected readonly priceHistory = signal<ProductPriceHistoryDto[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadProduct(id);
    }

    if (this.route.snapshot.queryParamMap.get('saved')) {
      this.alertService.success('Product saved successfully.');
    }
  }

  private loadProduct(id: string) {
    this.isLoading.set(true);

    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.priceHistory.set(product.priceHistory || []);

        if (product.isAddOn) {
          // Load products that use this add-on
          this.productService.getLinkedProducts(id).subscribe({
            next: (linked) => {
              this.linkedProducts.set(linked);
              this.isLoading.set(false);
            },
            error: (err) => {
              console.error('Failed to load linked products:', err);
              this.isLoading.set(false);
            },
          });
        } else {
          // Load add-ons for this product
          this.productService.getProductAddOns(id).subscribe({
            next: (addOns) => {
              this.addOns.set(addOns);
              this.isLoading.set(false);
            },
            error: (err) => {
              console.error('Failed to load add-ons:', err);
              this.isLoading.set(false);
            },
          });
        }
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
      },
    });
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
        this.alertService.error(err.message || 'Failed to delete product');
      },
    });
  }

  protected getProductCategoryName(category: ProductCategoryEnum): string {
    return ProductCategoryEnum[category];
  }

  protected openPriceHistory() {
    this.isHistoryOpen.set(true);
  }

  protected closePriceHistory() {
    this.isHistoryOpen.set(false);
  }
}
