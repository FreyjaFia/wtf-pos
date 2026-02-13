import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '@shared/components';

@Component({
  selector: 'app-settings',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './settings.html',
})
export class SettingsComponent {}
