import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Dock } from '../dock/dock';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Dock],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {}
