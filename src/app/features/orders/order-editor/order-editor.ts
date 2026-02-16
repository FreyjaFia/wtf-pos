import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, OrderService, ProductService } from '@core/services';
import { FilterDropdown, Icon, type FilterOption } from '@shared/components';
import {
  CartItemDto,
  CreateOrderCommand,
  OrderDto,
  OrderStatusEnum,
  PaymentMethodEnum,
  ProductCategoryEnum,
  ProductDto,
  UpdateOrderCommand,
} from '@shared/models';
import { debounceTime } from 'rxjs';
import { CheckoutModal } from '../checkout-modal/checkout-modal';

@Component({
  selector: 'app-order-editor',
  imports: [CommonModule, ReactiveFormsModule, Icon, CheckoutModal, FilterDropdown],
  templateUrl: './order-editor.html',
})
export class OrderEditor implements OnInit {
  readonly checkoutModal = viewChild.required(CheckoutModal);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  // Abandon order guard
  protected readonly showAbandonModal = signal(false);
  private pendingDeactivateResolve: ((value: boolean) => void) | null = null;
  private skipGuard = false;

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });
  protected readonly selectedProductCategories = signal<ProductCategoryEnum[]>([]);
  protected readonly cart = signal<CartItemDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly productsCache = signal<ProductDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isLoadingOrder = signal(false);
  protected readonly editMode = signal(false);
  protected readonly currentOrder = signal<OrderDto | null>(null);

  protected readonly isCompleted = computed(() => {
    const order = this.currentOrder();
    return order?.status === OrderStatusEnum.Completed;
  });

  protected itemCount = () => this.cart().reduce((s, i) => s + i.qty, 0);
  protected totalPrice = () => this.cart().reduce((s, i) => s + i.qty * i.price, 0);

  protected readonly categoryCounts = computed(() => {
    const cache = this.productsCache();
    return {
      [ProductCategoryEnum.Drink]: cache.filter((p) => p.category === ProductCategoryEnum.Drink)
        .length,
      [ProductCategoryEnum.Food]: cache.filter((p) => p.category === ProductCategoryEnum.Food)
        .length,
    };
  });

  protected readonly filterOptions = computed<FilterOption[]>(() => [
    {
      id: ProductCategoryEnum.Drink,
      label: 'Drink',
      count: this.categoryCounts()[ProductCategoryEnum.Drink],
    },
    {
      id: ProductCategoryEnum.Food,
      label: 'Food',
      count: this.categoryCounts()[ProductCategoryEnum.Food],
    },
  ]);

  ngOnInit() {
    const orderId = this.activatedRoute.snapshot.paramMap.get('id');
    if (orderId) {
      this.editMode.set(true);
      this.loadOrderForEditing(orderId);
    } else {
      this.loadProducts();
    }

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.applyFiltersToCache();
    });
  }

  loadOrderForEditing(orderId: string) {
    this.isLoadingOrder.set(true);

    this.orderService.getOrder(orderId).subscribe({
      next: (order) => {
        this.currentOrder.set(order);
        this.populateCartFromOrder(order);
        this.loadProducts();
        this.isLoadingOrder.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message || 'Failed to load order');
        this.isLoadingOrder.set(false);
      },
    });
  }

  private populateCartFromOrder(order: OrderDto) {
    const isCompleted = order.status === OrderStatusEnum.Completed;

    const cartItems: CartItemDto[] = order.items.map((item) => ({
      productId: item.productId,
      name: '',
      price: isCompleted ? (item.price ?? 0) : 0,
      qty: item.quantity,
      imageUrl: '',
    }));
    this.cart.set(cartItems);
  }

  loadProducts() {
    this.isLoading.set(true);

    const { searchTerm } = this.filterForm.value;

    this.productService
      .getProducts({
        searchTerm: searchTerm || null,
        category: null,
        isAddOn: false,
        isActive: true,
      })
      .subscribe({
        next: (result) => {
          this.productsCache.set(result);
          this.applyFiltersToCache();

          // If in edit mode, enrich cart items with product data
          if (this.editMode()) {
            const enrichedCart = this.cart().map((cartItem) => {
              const product = result.find((p: ProductDto) => p.id === cartItem.productId);
              return product
                ? {
                    ...cartItem,
                    name: product.name,
                    price: this.isCompleted() ? cartItem.price : product.price,
                    imageUrl: product.imageUrl,
                  }
                : cartItem;
            });
            this.cart.set(enrichedCart);
          }

          this.isLoading.set(false);
        },
        error: (err) => {
          this.alertService.error(err.message || 'Failed to load products');
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

  cancel() {
    this.router.navigate(['/orders/list']);
  }

  canDeactivate(): boolean | Promise<boolean> {
    // No guard for completed orders, empty carts, or after successful save
    if (this.skipGuard || this.isCompleted() || this.cart().length === 0) {
      return true;
    }

    this.showAbandonModal.set(true);

    return new Promise<boolean>((resolve) => {
      this.pendingDeactivateResolve = resolve;
    });
  }

  protected confirmAbandon() {
    this.showAbandonModal.set(false);

    if (this.pendingDeactivateResolve) {
      this.pendingDeactivateResolve(true);
      this.pendingDeactivateResolve = null;
    }
  }

  protected cancelAbandon() {
    this.showAbandonModal.set(false);

    if (this.pendingDeactivateResolve) {
      this.pendingDeactivateResolve(false);
      this.pendingDeactivateResolve = null;
    }
  }

  checkout() {
    if (this.cart().length === 0) {
      return;
    }

    this.checkoutModal().triggerOpen();
  }

  onOrderSaved() {
    if (this.cart().length === 0) {
      return;
    }

    if (this.editMode()) {
      this.updateExistingOrder(OrderStatusEnum.Pending);
    } else {
      this.createNewOrder(OrderStatusEnum.Pending);
    }
  }

  onOrderConfirmed(event: {
    paymentMethod: PaymentMethodEnum;
    amountReceived?: number;
    changeAmount?: number;
    tips?: number;
  }) {
    if (this.editMode()) {
      this.updateExistingOrder(OrderStatusEnum.Completed, event);
    } else {
      this.createNewOrder(OrderStatusEnum.Completed, event);
    }
  }

  private createNewOrder(
    status: OrderStatusEnum,
    event?: {
      paymentMethod: PaymentMethodEnum;
      amountReceived?: number;
      changeAmount?: number;
      tips?: number;
    },
  ) {
    const command: CreateOrderCommand = {
      customerId: null,
      items: this.cart().map((c) => ({
        id: '00000000-0000-0000-0000-000000000000',
        productId: c.productId,
        quantity: c.qty,
      })),
      status,
      ...(event && {
        paymentMethod: event.paymentMethod,
        amountReceived: event.amountReceived ?? null,
        changeAmount: event.changeAmount ?? null,
        tips: event.tips ?? null,
      }),
    };

    this.orderService.createOrder(command).subscribe({
      next: () => {
        this.skipGuard = true;
        this.router.navigate(['/orders/list']);
      },
      error: (err) => {
        console.error('Failed to create order', err);
        this.alertService.error(err.message || 'Failed to create order');
      },
    });
  }

  private updateExistingOrder(
    status: OrderStatusEnum,
    event?: {
      paymentMethod: PaymentMethodEnum;
      amountReceived?: number;
      changeAmount?: number;
      tips?: number;
    },
  ) {
    const order = this.currentOrder();
    if (!order) return;

    const command: UpdateOrderCommand = {
      id: order.id,
      customerId: order.customerId ?? null,
      items: this.cart().map((c) => ({
        id: '00000000-0000-0000-0000-000000000000',
        productId: c.productId,
        quantity: c.qty,
      })),
      status,
      ...(event && {
        paymentMethod: event.paymentMethod,
        amountReceived: event.amountReceived ?? null,
        changeAmount: event.changeAmount ?? null,
        tips: event.tips ?? null,
      }),
    };

    this.orderService.updateOrder(command).subscribe({
      next: () => {
        this.skipGuard = true;
        this.router.navigate(['/orders/list']);
      },
      error: (err) => {
        console.error('Failed to update order', err);
        this.alertService.error(err.message || 'Failed to update order');
      },
    });
  }

  private applyFiltersToCache() {
    const { searchTerm } = this.filterForm.value;

    const allowedCategories = this.selectedProductCategories();

    let items = [...this.productsCache()];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(lowerSearchTerm));
    }

    if (allowedCategories.length > 0) {
      items = items.filter((p) => allowedCategories.includes(p.category));
    }

    this.products.set(items);
  }

  onProductCategoryFilterChange(selectedIds: (string | number)[]) {
    this.selectedProductCategories.set(selectedIds as ProductCategoryEnum[]);
    this.applyFiltersToCache();
  }

  onProductCategoryFilterReset() {
    this.selectedProductCategories.set([]);
    this.applyFiltersToCache();
  }
}
