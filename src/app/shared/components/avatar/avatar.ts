import { Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  templateUrl: './avatar.html',
})
export class AvatarComponent {
  readonly letters = input.required<string>();
  readonly size = input(40);
  readonly label = input('Avatar');

  get fontSize(): number {
    return Math.round(this.size() * 0.45);
  }
}
