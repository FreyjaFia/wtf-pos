import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OrderService, ProductService } from '@core/services';
import { AlertComponent, FilterDropdown, Icon, type FilterOption } from '@shared/components';
import {
  CartItemDto,
  CreateOrderCommand,
  OrderStatusEnum,
  PaymentMethodEnum,
  ProductDto,
  ProductTypeEnum,
} from '@shared/models';
import { debounceTime } from 'rxjs';
import { CheckoutModal } from '../checkout-modal/checkout-modal';

@Component({
  selector: 'app-new-order',
  imports: [CommonModule, ReactiveFormsModule, Icon, CheckoutModal, AlertComponent, FilterDropdown],
  templateUrl: './new-order.html',
  styleUrl: './new-order.css',
})
export class NewOrder implements OnInit {
  readonly checkoutModal = viewChild.required(CheckoutModal);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });
  protected readonly selectedProductTypes = signal<ProductTypeEnum[]>([]);
  protected readonly cart = signal<CartItemDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly productsCache = signal<ProductDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showError = signal(false);

  protected itemCount = () => this.cart().reduce((s, i) => s + i.qty, 0);
  protected totalPrice = () => this.cart().reduce((s, i) => s + i.qty * i.price, 0);

  protected readonly filterOptions = computed<FilterOption[]>(() => [
    {
      id: ProductTypeEnum.Drink,
      label: 'Drink',
    },
    {
      id: ProductTypeEnum.Food,
      label: 'Food',
    },
  ]);

  ngOnInit() {
    this.loadProducts();

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersToCache();
    });
  }

  loadProducts() {
    this.isLoading.set(true);
    this.error.set(null);

    const { searchTerm } = this.filterForm.value;

    this.productService
      .getProducts({
        page: 1,
        pageSize: 100,
        searchTerm: searchTerm || null,
        type: null,
        isActive: true,
      })
      .subscribe({
        next: (result) => {
          this.productsCache.set(result.products);
          this.applyFiltersToCache();
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load products');
          this.isLoading.set(false);
        },
      });
  }

  addToCart(p: ProductDto) {
    const existing = this.cart().find((c) => c.productId === p.id);
    if (existing) {
      this.cart.set(this.cart().map((c) => (c.productId === p.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      this.cart.set([
        ...this.cart(),
        { productId: p.id, name: p.name, price: p.price, qty: 1, imageUrl: p.imageUrl },
      ]);
    }
  }

  increment(productId: string) {
    this.cart.set(
      this.cart().map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c)),
    );
  }

  decrement(productId: string) {
    const item = this.cart().find((c) => c.productId === productId);
    if (!item) return;
    if (item.qty <= 1) {
      this.cart.set(this.cart().filter((c) => c.productId !== productId));
    } else {
      this.cart.set(
        this.cart().map((c) => (c.productId === productId ? { ...c, qty: c.qty - 1 } : c)),
      );
    }
  }

  clearAll() {
    this.cart.set([]);
  }

  checkout() {
    if (this.cart().length === 0) {
      return;
    }

    this.checkoutModal().triggerOpen();
  }

  onOrderSaved() {
    const command: CreateOrderCommand = {
      customerId: null,
      items: this.cart().map((c) => ({
        id: '00000000-0000-0000-0000-000000000000',
        productId: c.productId,
        quantity: c.qty,
      })),
      status: OrderStatusEnum.Pending,
    };

    this.orderService.createOrder(command).subscribe({
      next: () => {
        this.clearAll();
        this.error.set(null);
        this.showError.set(false);
      },
      error: (err) => {
        console.error('Failed to save order', err);
        this.error.set(err.message || 'Failed to save order');
        this.showError.set(true);
      },
    });
  }

  onOrderConfirmed(event: {
    paymentMethod: PaymentMethodEnum;
    amountReceived?: number;
    changeAmount?: number;
    tips?: number;
  }) {
    const command: CreateOrderCommand = {
      customerId: null,
      items: this.cart().map((c) => ({
        id: '00000000-0000-0000-0000-000000000000',
        productId: c.productId,
        quantity: c.qty,
      })),
      status: OrderStatusEnum.Pending,
      paymentMethod: event.paymentMethod,
      amountReceived: event.amountReceived ?? null,
      changeAmount: event.changeAmount ?? null,
      tips: event.tips ?? null,
    };

    this.orderService.createOrder(command).subscribe({
      next: () => {
        this.clearAll();
        this.error.set(null);
        this.showError.set(false);
      },
      error: (err) => {
        console.error('Failed to create order', err);
        this.error.set(err.message || 'Failed to create order');
        this.showError.set(true);
      },
    });
  }

  hideError() {
    this.showError.set(false);
  }

  private applyFiltersToCache() {
    const { searchTerm } = this.filterForm.value;

    const allowedTypes = this.selectedProductTypes();

    let items = [...this.productsCache()];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(lowerSearchTerm));
    }

    if (allowedTypes.length > 0) {
      items = items.filter((p) => allowedTypes.includes(p.type));
    }

    this.products.set(items);
  }

  onProductTypeFilterChange(selectedIds: (string | number)[]) {
    this.selectedProductTypes.set(selectedIds as ProductTypeEnum[]);
    this.applyFiltersToCache();
  }

  onProductTypeFilterReset() {
    this.selectedProductTypes.set([]);
    this.applyFiltersToCache();
  }
}
