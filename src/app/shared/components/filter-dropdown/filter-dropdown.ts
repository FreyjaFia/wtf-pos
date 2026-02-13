import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Icon } from '../icons/icon/icon';

export interface FilterOption {
  id: string | number;
  label: string;
  count?: number;
  colorClass?: string;
}

@Component({
  selector: 'app-filter-dropdown',
  imports: [CommonModule, Icon],
  templateUrl: './filter-dropdown.html',
})
export class FilterDropdown {
  readonly title = input<string>('Filter');
  readonly icon = input<string>('icon-status');
  readonly options = input<FilterOption[]>([]);
  readonly selectedIds = input<(string | number)[]>([]);

  readonly filterChange = output<(string | number)[]>();
  readonly filterReset = output<void>();

  toggleFilter(optionId: string | number) {
    const updated = this.selectedIds().includes(optionId)
      ? this.selectedIds().filter((id) => id !== optionId)
      : [...this.selectedIds(), optionId];

    this.filterChange.emit(updated);
  }

  resetFilters() {
    this.filterReset.emit();
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
