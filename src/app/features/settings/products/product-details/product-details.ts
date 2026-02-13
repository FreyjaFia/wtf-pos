import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@core/services';
import { BadgeComponent, Icon } from '@shared/components';
import { ProductCategoryEnum, ProductDto, ProductTypeEnum } from '@shared/models';

@Component({
  selector: 'app-product-details',
  imports: [CommonModule, Icon, BadgeComponent],
  templateUrl: './product-details.html',
})
export class ProductDetailsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly product = signal<ProductDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ProductTypeEnum = ProductTypeEnum;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadProduct(id);
    }
  }

  private loadProduct(id: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected navigateToList() {
    this.router.navigate(['/settings/products']);
  }

  protected navigateToEdit() {
    if (this.product()) {
      this.router.navigate(['/settings/products/edit', this.product()!.id]);
    }
  }

  protected getProductCategoryName(category: ProductCategoryEnum): string {
    return ProductCategoryEnum[category];
  }

  protected deleteProduct() {
    const product = this.product();

    if (!product || !confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.navigateToList();
      },
      error: (err) => {
        this.error.set(err.message);
      },
    });
  }
}
