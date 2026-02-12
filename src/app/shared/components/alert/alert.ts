import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
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
      // Trigger effect when message changes
      this.message();

      const timer = setTimeout(() => {
        this.dismiss();
      }, 3000);

      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }

  protected get iconId(): string {
    return `icon-${this.type()}`;
  }

  protected dismiss(): void {
    this.isDismissing.set(true);

    // Wait for transition to complete before emitting dismissed event
    setTimeout(() => {
      this.dismissed.emit();
    }, 300);
  }
}
