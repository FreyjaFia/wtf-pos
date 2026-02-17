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
  selector: 'app-addons-swapper',
  imports: [CommonModule, Icon, AvatarComponent],
  templateUrl: './addons-swapper.html',
  styleUrls: ['./addons-swapper.css'],
})
export class AddonsSwapperComponent implements AfterViewInit {
  private readonly productService = inject(ProductService);
  private readonly alertService = inject(AlertService);

  @ViewChild('availableList') availableList!: ElementRef;
  @ViewChild('assignedList') assignedList!: ElementRef;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly availableAddOns = signal<(ProductSimpleDto & { type: AddOnTypeEnum })[]>([]);
  protected readonly assignedAddOns = signal<(ProductSimpleDto & { type: AddOnTypeEnum })[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly AddOnTypeEnum = AddOnTypeEnum;

  protected readonly addOnTypeOptions = [
    { value: AddOnTypeEnum.Size, label: 'Size' },
    { value: AddOnTypeEnum.Flavor, label: 'Flavor' },
    { value: AddOnTypeEnum.Topping, label: 'Topping' },
    { value: AddOnTypeEnum.Extra, label: 'Extra' },
  ];

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

    // Load all available add-ons (products marked as add-ons)
    this.productService.getProducts({ isAddOn: true, isActive: true }).subscribe({
      next: (allAddOns) => {
        // Now get the currently assigned add-ons for this product (grouped by type)
        this.productService.getProductAddOns(this.productId).subscribe({
          next: (addOnGroups) => {
            // Flatten the groups into a list with type info
            const assignedFlat = addOnGroups.flatMap((group) =>
              group.options.map((option) => ({ ...option, type: group.type })),
            );

            const assignedIds = new Set(assignedFlat.map((addon) => addon.id));

            // Split: available (not assigned) on left, assigned on right
            const availableNotAssigned = allAddOns
              .filter((addon) => !assignedIds.has(addon.id))
              .map((addon) => ({ ...addon, type: AddOnTypeEnum.Size })); // Default type for available

            this.availableAddOns.set(availableNotAssigned);
            this.assignedAddOns.set(assignedFlat);
            this.isLoading.set(false);

            // Initialize Sortable after data is loaded and DOM is populated
            this.initializeSortable();
          },
          error: (err) => {
            this.alertService.error(err.message);
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        this.alertService.error(err.message);
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

    // Get the current assigned add-ons with their type info
    const addOns = this.assignedAddOns().map((addon) => ({
      addOnId: addon.id,
      addOnType: addon.type,
    }));

    this.isSaving.set(true);

    this.productService.assignProductAddOns(this.productId, addOns).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.alertService.error(err.message);
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

  protected onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected changeAddOnType(addonId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newType = Number(select.value) as AddOnTypeEnum;

    this.assignedAddOns.set(
      this.assignedAddOns().map((a) => (a.id === addonId ? { ...a, type: newType } : a)),
    );
  }
}
