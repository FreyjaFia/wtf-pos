import { Component, input } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.html',
})
export class AvatarComponent {
  readonly label = input.required<string>();
  readonly size = input(40);
  readonly imageUrl = input<string | null>();

  get fontSize(): number {
    return Math.round(this.size() * 0.45);
  }

  get initials(): string {
    const value = this.label()?.trim() || '';

    if (!value) {
      return '';
    }

    const parts = value.split(/\s+/).filter(Boolean);
    const chars = parts.map((p) => p[0]).join('');

    return chars.slice(0, 2).toUpperCase();
  }
}
