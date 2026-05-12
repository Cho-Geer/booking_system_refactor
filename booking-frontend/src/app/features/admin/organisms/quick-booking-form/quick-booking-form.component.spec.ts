import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickBookingFormComponent } from './quick-booking-form.component';
import { By } from '@angular/platform-browser';

describe('QuickBookingFormComponent', () => {
  let component: QuickBookingFormComponent;
  let fixture: ComponentFixture<QuickBookingFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickBookingFormComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(QuickBookingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should display "Quick Booking" heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Quick Booking');
  });
  it('[Red] should have service select', () => {
    const select = fixture.nativeElement.querySelector('select');
    expect(select).toBeTruthy();
  });
  it('[Red] should have customer name input', () => {
    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
  });
  it('[Red] should have phone input', () => {
    const input = fixture.nativeElement.querySelector('input[type="tel"]');
    expect(input).toBeTruthy();
  });
  it('[Red] should have date input', () => {
    const input = fixture.nativeElement.querySelector('input[type="date"]');
    expect(input).toBeTruthy();
  });
  it('[Red] should have time input', () => {
    const input = fixture.nativeElement.querySelector('input[type="time"]');
    expect(input).toBeTruthy();
  });
  it('[Red] should have submit button', () => {
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Create Booking');
  });
});
