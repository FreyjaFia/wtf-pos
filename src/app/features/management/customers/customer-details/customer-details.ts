import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, CustomerService } from '@core/services';
import { AvatarComponent, BadgeComponent, Icon } from '@shared/components';
import { CustomerDto } from '@shared/models';

@Component({
  selector: 'app-customer-details',
  imports: [CommonModule, Icon, BadgeComponent, AvatarComponent],
  templateUrl: './customer-details.html',
  host: {
    class: 'block h-full',
  },
})
export class CustomerDetailsComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertService = inject(AlertService);

  protected readonly customer = signal<CustomerDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly showDeleteModal = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadCustomer(id);
    }

    if (this.route.snapshot.queryParamMap.get('saved')) {
      this.alertService.success('Customer saved successfully.');
    }
  }

  private loadCustomer(id: string) {
    this.isLoading.set(true);

    this.customerService.getCustomer(id).subscribe({
      next: (customer) => {
        this.customer.set(customer);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected goBack() {
    this.router.navigate(['/management/customers']);
  }

  protected navigateToEdit() {
    if (this.customer()) {
      this.router.navigate(['/management/customers/edit', this.customer()!.id]);
    }
  }

  protected deleteCustomer() {
    if (!this.customer()) {
      return;
    }

    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
  }

  protected confirmDelete() {
    if (!this.customer()) {
      return;
    }

    const customerId = this.customer()!.id;
    this.showDeleteModal.set(false);

    this.customerService.deleteCustomer(customerId).subscribe({
      next: () => {
        this.router.navigateByUrl('/management/customers');
      },
      error: (err) => {
        this.alertService.error(err.message || 'Failed to delete customer');
      },
    });
  }
}
