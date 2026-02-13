import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@core/services';
import { CreateProductDto, ProductTypeEnum, UpdateProductDto } from '@shared/models';
import { Icon } from '@shared/components';

@Component({
  selector: 'app-product-editor',
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './product-editor.html',
  styleUrl: './product-editor.css',
})
export class ProductEditorComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ProductTypeEnum = ProductTypeEnum;
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly currentImageUrl = signal<string | null>(null);

  protected readonly productForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    price: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(999999.99)],
    }),
    type: new FormControl<ProductTypeEnum>(ProductTypeEnum.Drink, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    isAddOn: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  private productId: string | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.productId = id;
      this.loadProduct(id);
    }
  }

  private loadProduct(id: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          name: product.name,
          price: product.price,
          type: product.type,
          isAddOn: product.isAddOn,
          isActive: product.isActive,
        });
        this.currentImageUrl.set(product.imageUrl || null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
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
    this.error.set(null);

    const formValue = this.productForm.getRawValue();

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
            this.navigateToList();
          }
        },
        error: (err) => {
          this.error.set(err.message);
          this.isSaving.set(false);
        },
      });
    } else {
      const createDto: CreateProductDto = formValue;

      this.productService.createProduct(createDto).subscribe({
        next: (createdProduct) => {
          // If there's a file selected, upload it after creating the product
          if (this.selectedFile()) {
            this.uploadImage(createdProduct.id);
          } else {
            this.isSaving.set(false);
            this.navigateToList();
          }
        },
        error: (err) => {
          this.error.set(err.message);
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
        this.error.set('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('File size exceeds 5MB limit.');
        return;
      }

      this.selectedFile.set(file);
      this.error.set(null);

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
    this.error.set(null);

    this.productService.uploadProductImage(id, file).subscribe({
      next: (updatedProduct) => {
        this.currentImageUrl.set(updatedProduct.imageUrl || null);
        this.selectedFile.set(null);
        this.imagePreview.set(null);
        this.isUploading.set(false);
        this.isSaving.set(false);

        if (productId) {
          // If we just created the product and uploaded image, navigate to list
          this.navigateToList();
        }
      },
      error: (err) => {
        this.error.set(err.message);
        this.isUploading.set(false);
        this.isSaving.set(false);
      },
    });
  }

  protected navigateToList() {
    this.router.navigate(['/settings/products']);
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

    return null;
  }

  private getFieldLabel(controlName: string): string {
    const labels: Record<string, string> = {
      name: 'Product name',
      price: 'Price',
      type: 'Product type',
    };
    return labels[controlName] || controlName;
  }

  protected hasError(controlName: string): boolean {
    const control = this.productForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }
}
