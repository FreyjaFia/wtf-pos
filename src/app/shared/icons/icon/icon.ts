import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  imports: [CommonModule],
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  @Input() name!: string;
  @Input() size: string = '24';
  @Input() fill: string = 'currentColor';
  @Input() class?: string;
}
