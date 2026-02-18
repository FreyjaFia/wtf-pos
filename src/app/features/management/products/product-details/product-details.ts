import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, AuthService, ProductService } from '@core/services';
import {
  AvatarComponent,
  BadgeComponent,
  Icon,
  PriceHistoryDrawerComponent,
} from '@shared/components';
import {
  AddOnGroupDto,
  AddOnTypeEnum,
  ProductCategoryEnum,
  ProductDto,
  ProductPriceHistoryDto,
} from '@shared/models';

@Component({
  selector: 'app-product-details',
  imports: [CommonModule, Icon, BadgeComponent, PriceHistoryDrawerComponent, AvatarComponent],
  templateUrl: './product-details.html',
  host: {
    class: 'block h-full',
  },
})
export class ProductDetailsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);

  protected readonly product = signal<ProductDto | null>(null);
  protected readonly addOns = signal<AddOnGroupDto[]>([]);
  protected readonly linkedProducts = signal<AddOnGroupDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isHistoryOpen = signal(false);
  protected readonly priceHistory = signal<ProductPriceHistoryDto[]>([]);
  protected readonly showAllAddOns = signal(false);
  protected readonly showAllLinked = signal(false);
  protected readonly showDeleteModal = signal(false);

  protected readonly flattenedAddOns = computed(() => {
    return this.addOns().flatMap((group) =>
      group.options.map((opt) => ({ ...opt, addOnType: group.type })),
    );
  });

  protected readonly flattenedLinkedProducts = computed(() => {
    return this.linkedProducts().flatMap((group) =>
      group.options.map((opt) => ({ ...opt, addOnType: group.type })),
    );
  });

  protected getAddOnTypeName(type: AddOnTypeEnum): string {
    return AddOnTypeEnum[type];
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadProduct(id);
    }

    if (this.route.snapshot.queryParamMap.get('saved')) {
      this.alertService.successSaved('Product');
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
    this.router.navigate(['/management/products']);
  }

  protected navigateToEdit() {
    if (!this.canWriteManagement()) {
      this.alertService.errorUnauthorized();
      return;
    }

    if (this.product()) {
      this.router.navigate(['/management/products/edit', this.product()!.id]);
    }
  }

  protected deleteProduct() {
    if (!this.canWriteManagement()) {
      this.alertService.errorUnauthorized();
      return;
    }

    if (!this.product()) {
      return;
    }

    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
  }

  protected confirmDelete() {
    if (!this.canWriteManagement()) {
      this.alertService.errorUnauthorized();
      return;
    }

    if (!this.product()) {
      return;
    }

    const productId = this.product()!.id;
    this.showDeleteModal.set(false);

    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.router.navigateByUrl('/management/products');
      },
      error: (err) => {
        this.alertService.error(err.message || this.alertService.getDeleteErrorMessage('product'));
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

  protected toggleShowAllAddOns() {
    this.showAllAddOns.update((v) => !v);
  }

  protected toggleShowAllLinked() {
    this.showAllLinked.update((v) => !v);
  }

  protected canWriteManagement(): boolean {
    return this.authService.canWriteManagement();
  }
}
