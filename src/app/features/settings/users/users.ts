import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './users.html',
  host: { class: 'flex-1 min-h-0 flex flex-col' },
})
export class UsersComponent {}