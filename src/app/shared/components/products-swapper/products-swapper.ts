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
import { ProductService } from '@core/services';
import { AlertComponent } from '@shared/components/alert/alert';
import { Icon } from '@shared/components/icons/icon/icon';
import { ProductSimpleDto } from '@shared/models';
import Sortable from 'sortablejs';

@Component({
  selector: 'app-products-swapper',
  imports: [CommonModule, AlertComponent, Icon],
  templateUrl: './products-swapper.html',
  styleUrls: ['./products-swapper.css'],
})
export class ProductsSwapperComponent implements AfterViewInit {
  private readonly productService = inject(ProductService);

  @ViewChild('availableList') availableList!: ElementRef;
  @ViewChild('assignedList') assignedList!: ElementRef;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showError = signal(false);
  protected readonly availableProducts = signal<ProductSimpleDto[]>([]);
  protected readonly linkedProducts = signal<ProductSimpleDto[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredAvailableProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) {
      return this.availableProducts();
    }

    return this.availableProducts().filter((product) => product.name.toLowerCase().includes(term));
  });

  addOnId = '';

  ngAfterViewInit() {
    if (this.addOnId) {
      this.loadProducts();
    }
  }

  private loadProducts() {
    this.isLoading.set(true);
    this.error.set(null);
    this.showError.set(false);

    // Load all non-add-on active products
    this.productService.getProducts({ isAddOn: false, isActive: true }).subscribe({
      next: (allProducts) => {
        // Get the currently linked products for this add-on
        this.productService.getLinkedProducts(this.addOnId).subscribe({
          next: (linkedProducts) => {
            const linkedIds = new Set(linkedProducts.map((p) => p.id));

            // Split: available (not linked) on left, linked on right
            const availableNotLinked = allProducts.filter((p) => !linkedIds.has(p.id));

            this.availableProducts.set(availableNotLinked);
            this.linkedProducts.set(linkedProducts);
            this.isLoading.set(false);

            // Initialize Sortable after data is loaded and DOM is populated
            this.initializeSortable();
          },
          error: (err) => {
            this.error.set(err.message);
            this.showError.set(true);
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err.message);
        this.showError.set(true);
        this.isLoading.set(false);
      },
    });
  }

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

    const availableIds = Array.from(this.availableList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    const linkedIds = Array.from(this.assignedList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    const allProducts = [...this.availableProducts(), ...this.linkedProducts()];

    this.availableProducts.set(allProducts.filter((p) => availableIds.includes(p.id)));
    this.linkedProducts.set(allProducts.filter((p) => linkedIds.includes(p.id)));
  }

  protected saveProducts() {
    if (!this.assignedList) {
      return;
    }

    const linkedIds = Array.from(this.assignedList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    this.isSaving.set(true);
    this.error.set(null);
    this.showError.set(false);

    this.productService.assignLinkedProducts(this.addOnId, linkedIds).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.error.set(err.message);
        this.showError.set(true);
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

  protected hideError() {
    this.showError.set(false);
  }

  protected onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
