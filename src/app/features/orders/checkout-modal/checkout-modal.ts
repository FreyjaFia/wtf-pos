import { CommonModule } from '@angular/common';
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartItemDto, PaymentMethodEnum } from '@shared/models';
import { Icon } from '@shared/components';

@Component({
  selector: 'app-checkout-modal',
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.css',
})
export class CheckoutModal {
  readonly checkoutDialog = viewChild.required<ElementRef<HTMLDialogElement>>('checkoutDialog');

  readonly cartItems = input<CartItemDto[]>([]);
  readonly totalPrice = input<number>(0);

  readonly orderConfirmed = output<{
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

  protected get isConfirmDisabled(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;

    // Disable if form is invalid
    if (this.paymentForm.invalid) {
      return true;
    }

    // For Cash payment, disable if change is negative (insufficient payment)
    if (paymentMethod === PaymentMethodEnum.Cash) {
      return this.change() < 0;
    }

    return false;
  }

  constructor() {
    this.paymentForm.get('amountReceived')?.valueChanges.subscribe(() => {
      this.calculateChange();
    });

    this.paymentForm.get('tips')?.valueChanges.subscribe(() => {
      this.calculateChange();
    });
  }

  triggerOpen() {
    this.resetForm();
    // Calculate initial change to show the amount owed
    this.calculateChange();
    this.checkoutDialog().nativeElement.showModal();
  }

  toggleSummary() {
    this.showSummary.set(!this.showSummary());
  }

  calculateChange() {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const amountReceived = this.paymentForm.get('amountReceived')?.value;

    if (paymentMethod === PaymentMethodEnum.Cash) {
      if (amountReceived !== null && amountReceived !== undefined) {
        const calculatedChange = amountReceived - this.totalPrice();
        this.change.set(calculatedChange);
      } else {
        // Show negative total as initial change when no amount entered
        this.change.set(-this.totalPrice());
      }
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

    // Close and immediately hide to prevent backdrop/focus artifacts during navigation
    const dialog = this.checkoutDialog().nativeElement;
    dialog.close();

    this.orderConfirmed.emit({
      paymentMethod,
      amountReceived:
        paymentMethod === PaymentMethodEnum.Cash && amountReceived ? amountReceived : undefined,
      changeAmount: paymentMethod === PaymentMethodEnum.Cash ? this.change() : undefined,
      tips: tips ?? undefined,
    });
  }

  cancelCheckout() {
    this.checkoutDialog().nativeElement.close();
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
