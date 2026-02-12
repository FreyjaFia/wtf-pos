import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutModal } from './checkout-modal';

describe('CheckoutModal', () => {
  let component: CheckoutModal;
  let fixture: ComponentFixture<CheckoutModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
