import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, CustomerService, OrderService, ProductService } from '@core/services';
import type { CustomerDropdownOption, FilterOption } from '@shared/components';
import {
  AddonSelectorComponent,
  AvatarComponent,
  CustomerDropdown,
  FilterDropdown,
  Icon,
} from '@shared/components';
import {
  CartAddOnDto,
  CartItemDto,
  CreateOrderCommand,
  CustomerDto,
  OrderDto,
  OrderItemRequestDto,
  OrderStatusEnum,
  PaymentMethodEnum,
  ProductCategoryEnum,
  ProductDto,
  UpdateOrderCommand,
} from '@shared/models';
import { debounceTime, forkJoin, of, switchMap } from 'rxjs';
import { CheckoutModal } from '../checkout-modal/checkout-modal';

@Component({
  selector: 'app-order-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Icon,
    CheckoutModal,
    FilterDropdown,
    CustomerDropdown,
    AddonSelectorComponent,
    AvatarComponent,
  ],
  templateUrl: './order-editor.html',
})
export class OrderEditor implements OnInit {
  protected onOrderSpecialInstructionsInput(event: Event) {
    const value = event.target instanceof HTMLTextAreaElement ? event.target.value : '';
    this.orderSpecialInstructions.set(value);
  }
  readonly checkoutModal = viewChild.required(CheckoutModal);
  readonly addonSelector = viewChild.required(AddonSelectorComponent);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly customerService = inject(CustomerService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  // Order-level special instructions state
  public readonly orderSpecialInstructions = signal('');
  public readonly showOrderSpecialInstructions = signal(false);

  // Abandon order guard
  protected readonly showAbandonModal = signal(false);
  private pendingDeactivateResolve: ((value: boolean) => void) | null = null;
  private skipGuard = false;
  private originalCartSnapshot = '';

  // Cancel order
  protected readonly showCancelOrderModal = signal(false);
  protected readonly showCreateCustomerModal = signal(false);
  protected readonly isCreatingCustomer = signal(false);

  protected readonly createCustomerForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly filterForm = new FormGroup({
    searchTerm: new FormControl(''),
  });
  protected readonly selectedProductCategories = signal<ProductCategoryEnum[]>([]);
  protected readonly cart = signal<CartItemDto[]>([]);
  protected readonly customers = signal<CustomerDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly productsCache = signal<ProductDto[]>([]);
  protected readonly selectedCustomerId = signal<string | null>(null);
  protected readonly isLoadingCustomers = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly editMode = signal(false);
  protected readonly currentOrder = signal<OrderDto | null>(null);

  protected readonly isCompleted = computed(() => {
    const order = this.currentOrder();
    return order?.status === OrderStatusEnum.Completed;
  });

  protected readonly isCancelled = computed(() => {
    const order = this.currentOrder();
    return order?.status === OrderStatusEnum.Cancelled;
  });

  protected readonly isRefunded = computed(() => {
    const order = this.currentOrder();
    return order?.status === OrderStatusEnum.Refunded;
  });

  protected readonly isReadOnly = computed(
    () => this.isCompleted() || this.isCancelled() || this.isRefunded(),
  );

  protected readonly isCancellable = computed(() => {
    const order = this.currentOrder();
    if (!order) {
      return false;
    }
    return order.status === OrderStatusEnum.Pending || order.status === OrderStatusEnum.Completed;
  });

  protected readonly canEditOrderSpecialInstructions = computed(() => {
    if (!this.editMode()) {
      return true;
    }

    const order = this.currentOrder();
    return order?.status === OrderStatusEnum.Pending;
  });
  protected readonly canEditCustomerSelection = computed(() => {
    if (!this.editMode()) {
      return true;
    }

    const order = this.currentOrder();
    return order?.status === OrderStatusEnum.Pending;
  });
  protected readonly selectedCustomerName = computed(() => {
    const selectedId = this.selectedCustomerId();
    if (!selectedId) {
      return 'Walk-in customer';
    }

    const selected = this.customers().find((customer) => customer.id === selectedId);
    if (!selected) {
      return 'Unknown customer';
    }

    return `${selected.firstName} ${selected.lastName}`.trim();
  });
  protected readonly customerOptions = computed<CustomerDropdownOption[]>(() =>
    this.customers().map((customer) => ({
      id: customer.id,
      label: this.getCustomerDisplayName(customer),
    })),
  );

  protected itemCount = () => this.cart().reduce((s, i) => s + i.qty, 0);
  protected totalPrice = () =>
    this.cart().reduce((s, i) => {
      const addOnTotal = (i.addOns ?? []).reduce((a, ao) => a + ao.price, 0);
      return s + i.qty * (i.price + addOnTotal);
    }, 0);

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
    this.loadCustomers();

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
    this.isLoading.set(true);

    this.orderService
      .getOrder(orderId)
      .pipe(
        switchMap((order) => {
          this.currentOrder.set(order);
          this.selectedCustomerId.set(order.customerId ?? null);
          this.orderSpecialInstructions.set(order.specialInstructions ?? '');
          this.populateCartFromOrder(order);
          return this.loadProductsForEdit();
        }),
      )
      .subscribe({
        next: () => {
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.alertService.error(err.message || 'Failed to load order');
          this.isLoading.set(false);
        },
      });
  }

  private populateCartFromOrder(order: OrderDto) {
    const isReadOnly =
      order.status === OrderStatusEnum.Completed ||
      order.status === OrderStatusEnum.Cancelled ||
      order.status === OrderStatusEnum.Refunded;

    const cartItems: CartItemDto[] = order.items.map((item) => {
      // Expand add-ons: each add-on item may have quantity > 1
      const expandedAddOns: CartAddOnDto[] = [];

      for (const ao of item.addOns ?? []) {
        for (let i = 0; i < ao.quantity; i++) {
          expandedAddOns.push({
            addOnId: ao.productId,
            name: '',
            price: 0,
          });
        }
      }

      return {
        productId: item.productId,
        name: '',
        price: isReadOnly ? (item.price ?? 0) : 0,
        qty: item.quantity,
        imageUrl: '',
        addOns: expandedAddOns.length > 0 ? expandedAddOns : undefined,
        specialInstructions: item.specialInstructions,
      };
    });
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
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.alertService.error(err.message || 'Failed to load products');
          this.isLoading.set(false);
        },
      });
  }

  private loadCustomers() {
    this.isLoadingCustomers.set(true);

    this.customerService.getCustomers().subscribe({
      next: (result) => {
        this.customers.set(result);
        this.isLoadingCustomers.set(false);
      },
      error: (err: Error) => {
        this.alertService.error(err.message || 'Failed to load customers');
        this.isLoadingCustomers.set(false);
      },
    });
  }

  /**
   * Loads products for edit mode — fetches the product grid and (if needed)
   * all products to resolve add-on names/prices. Returns an observable so
   * it can be chained after the order fetch.
   */
  private loadProductsForEdit() {
    const products$ = this.productService.getProducts({
      searchTerm: null,
      category: null,
      isAddOn: false,
      isActive: true,
    });

    const needsAddOns = this.cart().some((c) => c.addOns?.length);

    if (needsAddOns) {
      const allProducts$ = this.productService.getProducts({});

      return forkJoin([products$, allProducts$]).pipe(
        switchMap(([result, allProducts]) => {
          this.productsCache.set(result);
          this.applyFiltersToCache();
          this.enrichCartItems(allProducts);
          return of(void 0);
        }),
      );
    } else {
      return products$.pipe(
        switchMap((result) => {
          this.productsCache.set(result);
          this.applyFiltersToCache();
          this.enrichCartItems(result);
          return of(void 0);
        }),
      );
    }
  }

  private enrichCartItems(allProducts: ProductDto[]) {
    const enrichedCart = this.cart().map((cartItem) => {
      const product = allProducts.find((p) => p.id === cartItem.productId);
      const enrichedAddOns = cartItem.addOns?.map((ao) => {
        const addOnProduct = allProducts.find((p) => p.id === ao.addOnId);
        return addOnProduct ? { ...ao, name: addOnProduct.name, price: addOnProduct.price } : ao;
      });

      return product
        ? {
            ...cartItem,
            name: product.name,
            price: this.isReadOnly() ? cartItem.price : product.price,
            imageUrl: product.imageUrl,
            addOns: enrichedAddOns,
          }
        : { ...cartItem, addOns: enrichedAddOns };
    });

    this.cart.set(enrichedCart);
    this.snapshotCart();
  }

  private snapshotCart() {
    this.originalCartSnapshot = JSON.stringify(this.getOrderSnapshotPayload());
  }

  private hasCartChanged(): boolean {
    if (!this.originalCartSnapshot) {
      return this.cart().length > 0;
    }

    return JSON.stringify(this.getOrderSnapshotPayload()) !== this.originalCartSnapshot;
  }

  private getOrderSnapshotPayload() {
    return {
      customerId: this.selectedCustomerId(),
      specialInstructions: this.orderSpecialInstructions().trim(),
      items: this.cart().map((c) => ({
        productId: c.productId,
        qty: c.qty,
        addOns: c.addOns?.map((ao) => ao.addOnId).sort() ?? [],
      })),
    };
  }

  addToCart(p: ProductDto) {
    // If the product is an add-on-capable product, open the add-on selector
    this.addonSelector().open(p);
  }

  onAddonSelected(event: {
    product: ProductDto;
    addOns: CartAddOnDto[];
    specialInstructions?: string | null;
  }) {
    const { product, addOns, specialInstructions } = event;

    // Only stack items without add-ons (plain products) and no special instructions
    if (addOns.length === 0 && !specialInstructions) {
      const existing = this.cart().find(
        (c) => c.productId === product.id && !c.addOns?.length && !c.specialInstructions,
      );

      if (existing) {
        this.cart.set(
          this.cart().map((c) =>
            c.productId === product.id && !c.addOns?.length && !c.specialInstructions
              ? { ...c, qty: c.qty + 1 }
              : c,
          ),
        );
        return;
      }
    }

    // Items with add-ons or special instructions always get their own cart line
    this.cart.set([
      ...this.cart(),
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        imageUrl: product.imageUrl,
        addOns: addOns.length > 0 ? addOns : undefined,
        specialInstructions: specialInstructions || null,
      },
    ]);
  }

  // Helper for template add-on price calculation
  protected readonly addOnPriceReducer = (sum: number, ao: CartAddOnDto) => sum + ao.price;

  increment(productId: string, index: number) {
    this.cart.set(this.cart().map((c, i) => (i === index ? { ...c, qty: c.qty + 1 } : c)));
  }

  decrement(productId: string, index: number) {
    const item = this.cart()[index];

    if (!item) {
      return;
    }

    if (item.qty <= 1) {
      this.cart.set(this.cart().filter((_, i) => i !== index));
    } else {
      this.cart.set(this.cart().map((c, i) => (i === index ? { ...c, qty: c.qty - 1 } : c)));
    }
  }

  clearAll() {
    this.cart.set([]);
  }

  protected onCustomerSelected(customerId: string | null) {
    this.selectedCustomerId.set(customerId);
  }

  protected getCustomerDisplayName(customer: CustomerDto) {
    return `${customer.firstName} ${customer.lastName}`.trim();
  }

  protected openCreateCustomerModal() {
    this.createCustomerForm.reset({
      firstName: '',
      lastName: '',
    });
    this.createCustomerForm.markAsPristine();
    this.createCustomerForm.markAsUntouched();
    this.showCreateCustomerModal.set(true);
  }

  protected closeCreateCustomerModal() {
    if (this.isCreatingCustomer()) {
      return;
    }
    this.showCreateCustomerModal.set(false);
  }

  protected saveCustomerFromModal() {
    if (this.createCustomerForm.invalid || this.isCreatingCustomer()) {
      this.createCustomerForm.markAllAsTouched();
      return;
    }

    const firstName = this.createCustomerForm.controls.firstName.value.trim();
    const lastName = this.createCustomerForm.controls.lastName.value.trim();

    this.isCreatingCustomer.set(true);

    this.customerService
      .createCustomer({
        firstName,
        lastName,
      })
      .subscribe({
        next: (createdCustomer) => {
          this.customers.set([...this.customers(), createdCustomer]);
          this.selectedCustomerId.set(createdCustomer.id);
          this.showCreateCustomerModal.set(false);
          this.isCreatingCustomer.set(false);
          this.alertService.success('Customer added successfully.');
        },
        error: (err: Error) => {
          this.isCreatingCustomer.set(false);
          this.alertService.error(err.message || 'Failed to create customer');
        },
      });
  }

  cancel() {
    this.router.navigate(['/orders/list']);
  }

  canDeactivate(): boolean | Promise<boolean> {
    // No guard for completed/cancelled orders, after successful save, or unchanged cart
    if (this.skipGuard || this.isReadOnly() || !this.hasCartChanged()) {
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

  protected openCancelOrderModal() {
    this.showCancelOrderModal.set(true);
  }

  protected confirmCancelOrder() {
    const order = this.currentOrder();
    if (!order) {
      return;
    }

    this.showCancelOrderModal.set(false);

    this.orderService.voidOrder(order.id).subscribe({
      next: () => {
        this.skipGuard = true;

        const message =
          order.status === OrderStatusEnum.Completed
            ? 'Order has been refunded'
            : 'Order has been cancelled';

        this.alertService.success(message);
        this.router.navigate(['/orders/list']);
      },
      error: (err: Error) => {
        this.alertService.error(err.message || 'Failed to void order');
      },
    });
  }

  protected dismissCancelOrder() {
    this.showCancelOrderModal.set(false);
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
      customerId: this.selectedCustomerId(),
      items: this.cart().map((c) => ({
        productId: c.productId,
        quantity: c.qty,
        addOns: this.groupAddOns(c.addOns),
        specialInstructions: c.specialInstructions || null,
      })),
      specialInstructions: this.orderSpecialInstructions().trim() || null,
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
      customerId: this.selectedCustomerId(),
      items: this.cart().map((c) => ({
        productId: c.productId,
        quantity: c.qty,
        addOns: this.groupAddOns(c.addOns),
        specialInstructions: c.specialInstructions || null,
      })),
      specialInstructions: this.orderSpecialInstructions().trim() || null,
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

  private groupAddOns(addOns?: CartAddOnDto[]): OrderItemRequestDto[] {
    if (!addOns || addOns.length === 0) {
      return [];
    }

    const grouped = new Map<string, number>();

    for (const ao of addOns) {
      grouped.set(ao.addOnId, (grouped.get(ao.addOnId) ?? 0) + 1);
    }

    return Array.from(grouped.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
      addOns: [],
    }));
  }
}
