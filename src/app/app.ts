import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IconsSprite } from './shared/icons/icons-sprite/icons-sprite';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IconsSprite],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('wtf-pos');
}
