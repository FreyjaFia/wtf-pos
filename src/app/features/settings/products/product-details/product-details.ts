import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@core/services';
import { AlertComponent, BadgeComponent, Icon } from '@shared/components';
import { ProductCategoryEnum, ProductDto, ProductTypeEnum } from '@shared/models';

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

  protected readonly product = signal<ProductDto | null>(null);
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
        this.isLoading.set(false);
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
}
