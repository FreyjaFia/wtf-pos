import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon } from '../icons/icon/icon';

export type AlertType = 'info' | 'success' | 'error' | 'warning';

@Component({
  selector: 'app-alert',
  imports: [Icon],
  templateUrl: './alert.html',
  styleUrl: './alert.css',
})
export class AlertComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly type = input<AlertType>('info');
  readonly message = input.required<string>();
  readonly dismissed = output<void>();

  protected isDismissing = signal(false);

  constructor() {
    effect(() => {
      this.message();
      const timer = setTimeout(() => {
        this.dismiss();
      }, 4000);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }

  protected get iconId(): string {
    return `icon-${this.type()}`;
  }

  protected readonly borderClass = computed(() => {
    switch (this.type()) {
      case 'success':
        return 'border-l-[#065f46]';
      case 'error':
        return 'border-l-[#991b1b]';
      case 'warning':
        return 'border-l-[#92400e]';
      case 'info':
        return 'border-l-[#1e40af]';
    }
  });

  protected readonly iconClass = computed(() => {
    switch (this.type()) {
      case 'success':
        return 'text-[#065f46]';
      case 'error':
        return 'text-[#991b1b]';
      case 'warning':
        return 'text-[#92400e]';
      case 'info':
        return 'text-[#1e40af]';
    }
  });

  protected dismiss(): void {
    this.isDismissing.set(true);

    setTimeout(() => {
      this.dismissed.emit();
    }, 250);
  }
}
