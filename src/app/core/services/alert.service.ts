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

  successCreated(entity: string): void {
    this.success(`${entity} created successfully.`);
  }

  successUpdated(entity: string): void {
    this.success(`${entity} updated successfully.`);
  }

  successDeleted(entity: string): void {
    this.success(`${entity} deleted successfully.`);
  }

  successSaved(entity: string): void {
    this.success(`${entity} saved successfully.`);
  }

  successUploaded(entity = 'Image'): void {
    this.success(`${entity} uploaded successfully.`);
  }

  errorUnauthorized(): void {
    this.error('You are not authorized to perform this action.');
  }

  errorInvalidImageType(): void {
    this.error('Invalid image file type. Only JPG, PNG, GIF, and WebP are allowed.');
  }

  errorFileTooLarge(maxSizeMb = 5): void {
    this.error(`File size exceeds ${maxSizeMb}MB limit.`);
  }

  errorNothingToUpdate(): void {
    this.error('No changes to update.');
  }

  getLoadErrorMessage(entity: string): string {
    return `Failed to load ${entity.toLowerCase()}.`;
  }

  getCreateErrorMessage(entity: string): string {
    return `Failed to create ${entity.toLowerCase()}.`;
  }

  getUpdateErrorMessage(entity: string): string {
    return `Failed to update ${entity.toLowerCase()}.`;
  }

  getDeleteErrorMessage(entity: string): string {
    return `Failed to delete ${entity.toLowerCase()}.`;
  }

  getUploadErrorMessage(entity = 'image'): string {
    return `Failed to upload ${entity.toLowerCase()}.`;
  }

  private show(type: AlertState['type'], message: string): void {
    this.alertState.set({ type, message, visible: true });
  }

  dismiss(): void {
    this.alertState.update((state) => ({ ...state, visible: false }));
  }
}
