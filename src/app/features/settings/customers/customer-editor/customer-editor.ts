import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, CustomerService } from '@core/services';
import { Icon } from '@shared/components';
import { CreateCustomerDto, UpdateCustomerDto } from '@shared/models';

@Component({
  selector: 'app-customer-editor',
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './customer-editor.html',
  host: {
    class: 'block h-full',
  },
})
export class CustomerEditorComponent implements OnInit {
  // Unsaved changes guard
  protected readonly showDiscardModal = signal(false);
  private pendingDeactivateResolve: ((value: boolean) => void) | null = null;
  private skipGuard = false;

  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertService = inject(AlertService);

  protected readonly isEditMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly customerForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  protected customerId: string | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.customerId = id;
      this.loadCustomer(id);
    }
  }

  private loadCustomer(id: string) {
    this.isLoading.set(true);

    this.customerService.getCustomer(id).subscribe({
      next: (customer) => {
        this.customerForm.patchValue({
          firstName: customer.firstName,
          lastName: customer.lastName,
          address: customer.address || '',
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected saveCustomer() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const formValue = this.customerForm.getRawValue();

    if (this.isEditMode() && this.customerId) {
      const updateDto: UpdateCustomerDto = {
        id: this.customerId,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        address: formValue.address || null,
      };

      this.customerService.updateCustomer(updateDto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.skipGuard = true;
          this.navigateToDetails(this.customerId!);
        },
        error: (err) => {
          this.alertService.error(err.message);
          this.isSaving.set(false);
        },
      });
    } else {
      const createDto: CreateCustomerDto = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        address: formValue.address || null,
      };

      this.customerService.createCustomer(createDto).subscribe({
        next: (createdCustomer) => {
          this.isSaving.set(false);
          this.skipGuard = true;
          this.navigateToDetails(createdCustomer.id);
        },
        error: (err) => {
          this.alertService.error(err.message);
          this.isSaving.set(false);
        },
      });
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (this.skipGuard || !this.customerForm.dirty) {
      return true;
    }

    this.showDiscardModal.set(true);

    return new Promise<boolean>((resolve) => {
      this.pendingDeactivateResolve = resolve;
    });
  }

  protected confirmDiscard() {
    this.showDiscardModal.set(false);

    if (this.pendingDeactivateResolve) {
      this.pendingDeactivateResolve(true);
      this.pendingDeactivateResolve = null;
    }
  }

  protected cancelDiscard() {
    this.showDiscardModal.set(false);

    if (this.pendingDeactivateResolve) {
      this.pendingDeactivateResolve(false);
      this.pendingDeactivateResolve = null;
    }
  }

  protected goBack() {
    if (this.isEditMode() && this.customerId) {
      this.router.navigate(['/settings/customers/details', this.customerId]);
    } else {
      this.router.navigate(['/settings/customers']);
    }
  }

  private navigateToDetails(customerId: string) {
    this.router.navigate(['/settings/customers/details', customerId], {
      queryParams: { saved: true },
    });
  }

  protected getErrorMessage(controlName: string): string | null {
    const control = this.customerForm.get(controlName);

    if (!control || !control.errors || !control.touched) {
      return null;
    }

    if (control.errors['required']) {
      return `${this.getFieldLabel(controlName)} is required`;
    }

    if (control.errors['maxlength']) {
      return `${this.getFieldLabel(controlName)} cannot exceed ${control.errors['maxlength'].requiredLength} characters`;
    }

    return null;
  }

  private getFieldLabel(controlName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First name',
      lastName: 'Last name',
      address: 'Address',
    };
    return labels[controlName] || controlName;
  }

  protected hasError(controlName: string): boolean {
    const control = this.customerForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }
}
