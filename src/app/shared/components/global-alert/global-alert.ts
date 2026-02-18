import { Component, inject } from '@angular/core';
import { AlertComponent } from '../alert/alert';
import { AlertService } from '@core/services';

@Component({
  selector: 'app-global-alert',
  imports: [AlertComponent],
  template: `
    @if (alertService.alert().visible) {
      <div class="fixed top-20 left-1/2 z-50 max-w-md -translate-x-1/2 px-4">
        <app-alert
          [type]="alertService.alert().type"
          [message]="alertService.alert().message"
          (dismissed)="alertService.dismiss()"
        />
      </div>
    }
  `,
  standalone: true,
})
export class GlobalAlertComponent {
  protected readonly alertService = inject(AlertService);
}
