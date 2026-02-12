import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartItemDto } from '../../../shared/models/cart.models';
import { PaymentMethodEnum } from '../../../shared/models/order.models';

@Component({
  selector: 'app-checkout-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.css',
})
export class CheckoutModal implements AfterViewInit {
  @ViewChild('checkoutDialog', { read: ElementRef, static: true })
  checkoutDialog!: ElementRef<HTMLDialogElement>;

  @Input() cartItems: CartItemDto[] = [];
  @Input() totalPrice: number = 0;

  @Output() orderConfirmed = new EventEmitter<{
    paymentMethod: PaymentMethodEnum;
    amountReceived?: number;
    changeAmount?: number;
    tips?: number;
  }>();

  protected readonly paymentForm = new FormGroup({
    paymentMethod: new FormControl<PaymentMethodEnum>(PaymentMethodEnum.Cash, Validators.required),
    amountReceived: new FormControl<number | null>(null),
    tips: new FormControl<number | null>(null),
    notes: new FormControl(''),
  });

  protected readonly PaymentMethodEnum = PaymentMethodEnum;
  protected readonly change = signal<number>(0);
  protected readonly showSummary = signal<boolean>(false);

  ngAfterViewInit() {
    this.checkoutDialog.nativeElement.addEventListener('close', () => {
      this.resetForm();
    });

    this.paymentForm.get('amountReceived')?.valueChanges.subscribe(() => {
      this.calculateChange();
    });

    this.paymentForm.get('tips')?.valueChanges.subscribe(() => {
      this.calculateChange();
    });
  }

  triggerOpen() {
    this.resetForm();
    this.checkoutDialog.nativeElement.showModal();
  }

  toggleSummary() {
    this.showSummary.set(!this.showSummary());
  }

  calculateChange() {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const amountReceived = this.paymentForm.get('amountReceived')?.value;
    const tips = this.paymentForm.get('tips')?.value ?? 0;

    if (paymentMethod === PaymentMethodEnum.Cash && amountReceived) {
      const calculatedChange = amountReceived - this.totalPrice;
      this.change.set(calculatedChange);
    } else {
      this.change.set(0);
    }
  }

  confirmOrder() {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const amountReceived = this.paymentForm.get('amountReceived')?.value;
    const tips = this.paymentForm.get('tips')?.value;

    if (paymentMethod === null || paymentMethod === undefined) {
      return;
    }

    if (paymentMethod === PaymentMethodEnum.Cash) {
      if (!amountReceived || amountReceived < this.totalPrice) {
        alert('Please enter an amount at least equal to the total price');
        return;
      }
    }

    this.orderConfirmed.emit({
      paymentMethod,
      amountReceived:
        paymentMethod === PaymentMethodEnum.Cash && amountReceived ? amountReceived : undefined,
      changeAmount: paymentMethod === PaymentMethodEnum.Cash ? this.change() : undefined,
      tips: tips ?? undefined,
    });

    this.checkoutDialog.nativeElement.close();
  }

  cancelCheckout() {
    this.checkoutDialog.nativeElement.close();
  }

  private resetForm() {
    this.paymentForm.reset({
      paymentMethod: PaymentMethodEnum.Cash,
      amountReceived: null,
      tips: null,
      notes: '',
    });
    this.change.set(0);
    this.showSummary.set(false);
  }
}
