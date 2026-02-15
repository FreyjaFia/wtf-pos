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
  selector: 'app-addons-swapper',
  imports: [CommonModule, AlertComponent, Icon],
  templateUrl: './addons-swapper.html',
  styleUrls: ['./addons-swapper.css'],
})
export class AddonsSwapperComponent implements AfterViewInit {
  private readonly productService = inject(ProductService);

  @ViewChild('availableList') availableList!: ElementRef;
  @ViewChild('assignedList') assignedList!: ElementRef;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showError = signal(false);
  protected readonly availableAddOns = signal<ProductSimpleDto[]>([]);
  protected readonly assignedAddOns = signal<ProductSimpleDto[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredAvailableAddOns = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) {
      return this.availableAddOns();
    }

    return this.availableAddOns().filter((addon) => addon.name.toLowerCase().includes(term));
  });

  productId = '';

  ngAfterViewInit() {
    if (this.productId) {
      this.loadAddOns();
    }
  }

  private loadAddOns() {
    this.isLoading.set(true);
    this.error.set(null);
    this.showError.set(false);

    // Load all available add-ons (products marked as add-ons)
    this.productService.getProducts({ isAddOn: true, isActive: true }).subscribe({
      next: (allAddOns) => {
        // Now get the currently assigned add-ons for this product
        this.productService.getProductAddOns(this.productId).subscribe({
          next: (assignedAddOns) => {
            const assignedIds = new Set(assignedAddOns.map((addon) => addon.id));

            // Split: available (not assigned) on left, assigned on right
            const availableNotAssigned = allAddOns.filter((addon) => !assignedIds.has(addon.id));

            this.availableAddOns.set(availableNotAssigned);
            this.assignedAddOns.set(assignedAddOns);
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
        group: 'addons-swap',
        animation: 150,
        ghostClass: 'opacity-50',
        dragClass: '!rounded-none',
        onEnd: () => {
          // Sync signals with current DOM state after drag completes
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

    // Get all item IDs from available list
    const availableIds = Array.from(this.availableList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    // Get all item IDs from assigned list
    const assignedIds = Array.from(this.assignedList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    // Get all add-ons from both current lists
    const allAddOns = [...this.availableAddOns(), ...this.assignedAddOns()];

    // Update signals to reflect current state after drag
    this.availableAddOns.set(allAddOns.filter((addon) => availableIds.includes(addon.id)));
    this.assignedAddOns.set(allAddOns.filter((addon) => assignedIds.includes(addon.id)));
  }

  protected saveAddOns() {
    if (!this.assignedList) {
      return;
    }

    const assignedIds = Array.from(this.assignedList.nativeElement.querySelectorAll('[data-id]')).map(
      (el) => (el as HTMLElement).getAttribute('data-id') || '',
    );

    this.isSaving.set(true);
    this.error.set(null);
    this.showError.set(false);

    this.productService.assignProductAddOns(this.productId, assignedIds).subscribe({
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
    // Close the modal - implementation depends on how parent handles this
    const modal = document.querySelector('#addons-swapper-modal') as HTMLDialogElement;

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
