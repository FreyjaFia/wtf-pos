import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertComponent } from './alert';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', 'Test message');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test message');
  });

  it('should apply info class by default', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const alert = compiled.querySelector('.alert');
    expect(alert?.classList.contains('alert-info')).toBe(true);
  });

  it('should apply success class', () => {
    fixture.componentRef.setInput('type', 'success');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const alert = compiled.querySelector('.alert');
    expect(alert?.classList.contains('alert-success')).toBe(true);
  });

  it('should show dismiss button when dismissible', () => {
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dismissButton = compiled.querySelector('button');
    expect(dismissButton).toBeTruthy();
  });

  it('should hide alert when dismissed', () => {
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dismissButton = compiled.querySelector('button') as HTMLButtonElement;
    dismissButton.click();
    fixture.detectChanges();
    const alert = compiled.querySelector('.alert');
    expect(alert).toBeFalsy();
  });
});
