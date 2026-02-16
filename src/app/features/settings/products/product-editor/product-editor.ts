import { CommonModule, Location } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, ProductService } from '@core/services';
import {
  AddonsSwapperComponent,
  Icon,
  PriceHistoryDrawerComponent,
  ProductsSwapperComponent,
} from '@shared/components';
import {
  AddOnGroupDto,
  CreateProductDto,
  ProductCategoryEnum,
  ProductPriceHistoryDto,
  ProductSimpleDto,
  UpdateProductDto,
} from '@shared/models';

@Component({
  selector: 'app-product-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Icon,
    AddonsSwapperComponent,
    ProductsSwapperComponent,
    PriceHistoryDrawerComponent,
  ],
  templateUrl: './product-editor.html',
  host: {
    class: 'block h-full',
  },
})
export class ProductEditorComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly alertService = inject(AlertService);

  @ViewChild(AddonsSwapperComponent) addonsSwapper!: AddonsSwapperComponent;
  @ViewChild(ProductsSwapperComponent) productsSwapper!: ProductsSwapperComponent;

  protected readonly isEditMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly ProductCategoryEnum = ProductCategoryEnum;
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly currentImageUrl = signal<string | null>(null);
  protected readonly isHistoryOpen = signal(false);
  protected readonly priceHistory = signal<ProductPriceHistoryDto[]>([]);
  protected readonly assignedAddOns = signal<AddOnGroupDto[]>([]);
  protected readonly linkedProducts = signal<ProductSimpleDto[]>([]);
  protected readonly lastUpdatedAt = signal<string | null>(null);

  protected readonly flattenedAssignedAddOns = computed(() => {
    return this.assignedAddOns().flatMap((group) => group.options);
  });

  protected readonly productForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(10), Validators.pattern(/^[A-Z0-9]+$/)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    price: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(999999.99)],
    }),
    category: new FormControl<ProductCategoryEnum>(ProductCategoryEnum.Drink, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    isAddOn: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  protected productId: string | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.productId = id;
      this.loadProduct(id);
    }

    this.productForm.controls.isAddOn.valueChanges.subscribe((isAddOn) => {
      if (isAddOn) {
        this.productForm.controls.category.setValue(ProductCategoryEnum.Other);
        this.productForm.controls.category.disable();
      } else {
        this.productForm.controls.category.enable();
      }
    });
  }

  private loadProduct(id: string) {
    this.isLoading.set(true);

    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          name: product.name,
          code: product.code,
          description: product.description || '',
          price: product.price,
          category: product.category,
          isAddOn: product.isAddOn,
          isActive: product.isActive,
        });
        this.currentImageUrl.set(product.imageUrl || null);
        this.priceHistory.set(product.priceHistory || []);
        this.lastUpdatedAt.set(product.updatedAt || product.createdAt);

        if (product.isAddOn) {
          this.productForm.controls.category.disable();
          this.loadLinkedProducts(id);
        } else {
          this.loadAssignedAddOns(id);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected saveProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const formValue = this.productForm.getRawValue();

    if (formValue.isAddOn) {
      formValue.category = ProductCategoryEnum.Other;
    }

    if (this.isEditMode() && this.productId) {
      const updateDto: UpdateProductDto = {
        id: this.productId,
        ...formValue,
      };

      this.productService.updateProduct(updateDto).subscribe({
        next: () => {
          // If there's a file selected, upload it after updating the product
          if (this.selectedFile()) {
            this.uploadImage();
          } else {
            this.isSaving.set(false);
            this.navigateToDetails(this.productId!);
          }
        },
        error: (err) => {
          this.alertService.error(err.message);
          this.isSaving.set(false);
        },
      });
    } else {
      const createDto: CreateProductDto = {
        ...formValue,
        category: formValue.category as ProductCategoryEnum,
      };

      this.productService.createProduct(createDto).subscribe({
        next: (createdProduct) => {
          // If there's a file selected, upload it after creating the product
          if (this.selectedFile()) {
            this.uploadImage(createdProduct.id);
          } else {
            this.isSaving.set(false);
            this.navigateToDetails(createdProduct.id);
          }
        },
        error: (err) => {
          this.alertService.error(err.message);
          this.isSaving.set(false);
        },
      });
    }
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        this.alertService.error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.alertService.error('File size exceeds 5MB limit.');
        return;
      }

      this.selectedFile.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  protected removeImage() {
    this.selectedFile.set(null);
    this.imagePreview.set(null);

    // Reset file input
    const fileInput = document.getElementById('productImage') as HTMLInputElement;

    if (fileInput) {
      fileInput.value = '';
    }
  }

  protected uploadImage(productId?: string) {
    const file = this.selectedFile();
    const id = productId || this.productId;

    if (!file || !id) {
      return;
    }

    this.isUploading.set(true);

    this.productService.uploadProductImage(id, file).subscribe({
      next: (updatedProduct) => {
        this.currentImageUrl.set(updatedProduct.imageUrl || null);
        this.selectedFile.set(null);
        this.imagePreview.set(null);
        this.isUploading.set(false);
        this.isSaving.set(false);

        if (productId) {
          // If we just created the product and uploaded image, navigate to details
          this.navigateToDetails(productId);
        } else if (this.productId) {
          // Update flow with image upload
          this.navigateToDetails(this.productId);
        }
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isUploading.set(false);
        this.isSaving.set(false);
      },
    });
  }

  protected goBack() {
    this.location.back();
  }

  private navigateToDetails(productId: string) {
    this.router.navigate(['/settings/products/details', productId], {
      queryParams: { saved: true },
    });
  }

  protected getErrorMessage(controlName: string): string | null {
    const control = this.productForm.get(controlName);

    if (!control || !control.errors || !control.touched) {
      return null;
    }

    if (control.errors['required']) {
      return `${this.getFieldLabel(controlName)} is required`;
    }

    if (control.errors['maxLength']) {
      return `${this.getFieldLabel(controlName)} cannot exceed ${control.errors['maxLength'].requiredLength} characters`;
    }

    if (control.errors['min']) {
      return `${this.getFieldLabel(controlName)} must be at least ${control.errors['min'].min}`;
    }

    if (control.errors['max']) {
      return `${this.getFieldLabel(controlName)} cannot exceed ${control.errors['max'].max}`;
    }

    if (control.errors['pattern']) {
      if (controlName === 'code') {
        return 'Product code must contain only uppercase letters and numbers';
      }
    }

    return null;
  }

  private getFieldLabel(controlName: string): string {
    const labels: Record<string, string> = {
      name: 'Product name',
      code: 'Product code',
      price: 'Price',
      type: 'Product type',
    };
    return labels[controlName] || controlName;
  }

  protected hasError(controlName: string): boolean {
    const control = this.productForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  protected onCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const uppercased = input.value.toUpperCase();
    this.productForm.controls.code.setValue(uppercased, { emitEvent: false });
  }

  private loadAssignedAddOns(productId: string) {
    this.productService.getProductAddOns(productId).subscribe({
      next: (addons) => this.assignedAddOns.set(addons),
      error: () => this.assignedAddOns.set([]),
    });
  }

  private loadLinkedProducts(productId: string) {
    this.productService.getLinkedProducts(productId).subscribe({
      next: (linked) => this.linkedProducts.set(linked),
      error: () => this.linkedProducts.set([]),
    });
  }

  protected openAddOnsManager() {
    if (!this.productId) {
      this.alertService.error('Please save the product first before managing add-ons.');
      return;
    }

    const modal = document.querySelector('#addons-swapper-modal') as HTMLDialogElement;

    if (modal) {
      if (this.addonsSwapper) {
        this.addonsSwapper.productId = this.productId;
        this.addonsSwapper.ngAfterViewInit();
      }

      // Refresh summary when modal closes
      modal.addEventListener(
        'close',
        () => {
          if (this.productId) {
            this.loadAssignedAddOns(this.productId);
          }
        },
        { once: true },
      );

      modal.showModal();
    }
  }

  protected openProductsManager() {
    if (!this.productId) {
      this.alertService.error('Please save the product first before managing linked products.');
      return;
    }

    const modal = document.querySelector('#products-swapper-modal') as HTMLDialogElement;

    if (modal) {
      if (this.productsSwapper) {
        this.productsSwapper.addOnId = this.productId;
        this.productsSwapper.ngAfterViewInit();
      }

      modal.addEventListener(
        'close',
        () => {
          if (this.productId) {
            this.loadLinkedProducts(this.productId);
          }
        },
        { once: true },
      );

      modal.showModal();
    }
  }

  protected openPriceHistory() {
    this.isHistoryOpen.set(true);
  }

  protected closePriceHistory() {
    this.isHistoryOpen.set(false);
  }
}
