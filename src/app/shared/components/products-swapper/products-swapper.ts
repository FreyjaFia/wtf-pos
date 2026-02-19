import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { AlertService, ProductService } from '@core/services';
import { Icon } from '@shared/components/icons/icon/icon';
import { AvatarComponent } from '@shared/components/avatar/avatar';
import { AddOnTypeEnum, ProductSimpleDto } from '@shared/models';
import Sortable from 'sortablejs';

@Component({
  selector: 'app-products-swapper',
  imports: [CommonModule, Icon, AvatarComponent],
  templateUrl: './products-swapper.html',
  styleUrls: ['./products-swapper.css'],
})
export class ProductsSwapperComponent implements AfterViewInit {
  private readonly productService = inject(ProductService);
  private readonly alertService = inject(AlertService);

  @ViewChild('availableList') availableList!: ElementRef;
  @ViewChild('assignedList') assignedList!: ElementRef;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly availableProducts = signal<ProductSimpleDto[]>([]);
  protected readonly linkedProducts = signal<(ProductSimpleDto & { type: AddOnTypeEnum })[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly AddOnTypeEnum = AddOnTypeEnum;

  protected readonly addOnTypeOptions = [
    { value: AddOnTypeEnum.Size, label: 'Size' },
    { value: AddOnTypeEnum.Flavor, label: 'Flavor' },
    { value: AddOnTypeEnum.Topping, label: 'Topping' },
    { value: AddOnTypeEnum.Extra, label: 'Extra' },
  ];

  protected readonly filteredAvailableProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) {
      return this.availableProducts();
    }

    return this.availableProducts().filter((product) => product.name.toLowerCase().includes(term));
  });

  addOnId = '';
  addOnType = AddOnTypeEnum.Size; // Default type

  ngAfterViewInit() {
    if (this.addOnId) {
      this.loadProducts();
    }
  }

  private loadProducts() {
    this.isLoading.set(true);

    // Load all non-add-on active products
    this.productService.getProducts({ isAddOn: false, isActive: true }).subscribe({
      next: (allProducts) => {
        // Get the currently linked products for this add-on
        this.productService.getLinkedProducts(this.addOnId).subscribe({
          next: (linkedProductsGroup) => {
            // Flatten the groups into a list with type info
            const assignedFlat = linkedProductsGroup.flatMap((group) =>
              group.options.map((option) => ({ ...option, type: group.type })),
            );

            const linkedIds = new Set(assignedFlat.map((p) => p.id));

            // Split: available (not linked) on left, linked on right
            const availableNotLinked = allProducts
              .filter((addon) => !linkedIds.has(addon.id))
              .map((addon) => ({ ...addon, type: AddOnTypeEnum.Size })); // Default type for available

            this.availableProducts.set(this.sortByName(availableNotLinked));
            this.linkedProducts.set(this.sortByName(assignedFlat));
            this.isLoading.set(false);

            // Initialize Sortable after data is loaded and DOM is populated
            this.initializeSortable();
          },
          error: () => {
            this.isLoading.set(false);
          },
        });
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  //   private loadProductsWithoutAddOnInfo() {
  //     this.isLoading.set(true);

  //     // Load all non-add-on active products
  //     this.productService.getProducts({ isAddOn: false, isActive: true }).subscribe({
  //       next: (allProducts) => {
  //         // Get the currently linked products for this add-on
  //         this.productService.getLinkedProducts(this.addOnId).subscribe({
  //           next: (linkedProducts) => {
  //             const linkedIds = new Set(linkedProducts.map((p) => p.id));

  //             // Split: available (not linked) on left, linked on right
  //             const availableNotLinked = allProducts.filter((p) => !linkedIds.has(p.id));
  //             const linkedWithType = linkedProducts.map((p) => ({ ...p, type: this.addOnType }));

  //             this.availableProducts.set(availableNotLinked);
  //             this.linkedProducts.set(linkedWithType);
  //             this.isLoading.set(false);

  //             // Initialize Sortable after data is loaded and DOM is populated
  //             this.initializeSortable();
  //           },
  //           error: (err) => {
  //             this.alertService.error(err.message);
  //             this.isLoading.set(false);
  //           },
  //         });
  //       },
  //       error: (err) => {
  //         this.alertService.error(err.message);
  //         this.isLoading.set(false);
  //       },
  //     });
  //   }

  private initializeSortable() {
    setTimeout(() => {
      if (!this.availableList || !this.assignedList) {
        return;
      }

      const options = {
        group: 'products-swap',
        animation: 150,
        ghostClass: 'opacity-50',
        dragClass: '!rounded-none',
        onEnd: () => {
          this.syncSignalsWithDOM();
        },
      };

      new Sortable(this.availableList.nativeElement, options);
      new Sortable(this.assignedList.nativeElement, options);
    }, 100);
  }

  private syncSignalsWithDOM() {
    if (!this.availableList || !this.assignedList) {
      return;
    }

    const availableIds = Array.from(
      this.availableList.nativeElement.querySelectorAll('[data-id]'),
    ).map((el) => (el as HTMLElement).getAttribute('data-id') || '');

    const linkedIds = Array.from(this.assignedList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    const allProducts = [...this.availableProducts(), ...this.linkedProducts()];
    const productById = new Map(allProducts.map((p) => [p.id, p]));

    // Build a map of existing type selections to preserve them
    const existingTypes = new Map(this.linkedProducts().map((p) => [p.id, p.type]));

    this.availableProducts.set(
      availableIds.map((id) => productById.get(id)).filter((p): p is ProductSimpleDto => !!p),
    );
    this.linkedProducts.set(
      linkedIds
        .map((id) => productById.get(id))
        .filter((p): p is ProductSimpleDto => !!p)
        .map((p) => ({ ...p, type: existingTypes.get(p.id) ?? this.addOnType })),
    );
  }

  protected saveProducts() {
    if (!this.assignedList) {
      return;
    }

    // Get the current linked products with their type info
    const products = this.linkedProducts().map((product) => ({
      productId: product.id,
      addOnType: product.type,
    }));

    this.isSaving.set(true);

    this.productService.assignLinkedProducts(this.addOnId, products).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.alertService.successSaved('Linked products');
        this.closeModal();
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isSaving.set(false);
      },
    });
  }

  protected closeModal() {
    const modal = document.querySelector('#products-swapper-modal') as HTMLDialogElement;

    if (modal) {
      modal.close();
    }
  }

  protected onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected changeProductType(productId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newType = Number(select.value) as AddOnTypeEnum;

    this.linkedProducts.set(
      this.linkedProducts().map((p) => (p.id === productId ? { ...p, type: newType } : p)),
    );
  }

  private sortByName<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }
}
