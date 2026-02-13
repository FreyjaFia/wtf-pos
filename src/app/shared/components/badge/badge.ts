import { Component, input } from '@angular/core';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-indigo-50 text-indigo-600',
  default: 'bg-gray-100 text-gray-700',
};

@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('info');

  protected readonly variantClass = () => variantClasses[this.variant()];
}
