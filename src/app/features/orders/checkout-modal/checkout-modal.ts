import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-checkout-modal',
  imports: [],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.css',
})
export class CheckoutModal implements AfterViewInit {
  @ViewChild('checkoutDialog', { read: ElementRef, static: true })
  checkoutDialog!: ElementRef<HTMLDialogElement>;

  @Output() orderConfirmed = new EventEmitter<void>();

  ngAfterViewInit() {
    this.checkoutDialog.nativeElement.addEventListener('close', () => {
      this.orderConfirmed.emit();
    });
  }

  triggerOpen() {
    this.checkoutDialog.nativeElement.showModal();
  }
}
