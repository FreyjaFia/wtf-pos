import { Component, input } from '@angular/core';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-800',
  error: 'bg-red-50 text-red-800',
  warning: 'bg-orange-50 text-orange-800',
  info: 'bg-blue-50 text-blue-800',
  default: 'bg-gray-100 text-gray-800',
};

@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('info');

  protected readonly variantClass = () => variantClasses[this.variant()];
}
