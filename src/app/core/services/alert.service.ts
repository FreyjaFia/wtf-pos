import { Injectable, effect, signal } from '@angular/core';

export interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly alertState = signal<AlertState>({
    type: 'error',
    message: '',
    visible: false,
  });

  readonly alert = this.alertState.asReadonly();

  constructor() {
    effect(() => {
      const state = this.alertState();
      if (state.visible) {
        const timer = setTimeout(() => {
          this.dismiss();
        }, 5000);

        return () => clearTimeout(timer);
      }
      return undefined;
    });
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  private show(type: AlertState['type'], message: string): void {
    this.alertState.set({ type, message, visible: true });
  }

  dismiss(): void {
    this.alertState.update((state) => ({ ...state, visible: false }));
  }
}
