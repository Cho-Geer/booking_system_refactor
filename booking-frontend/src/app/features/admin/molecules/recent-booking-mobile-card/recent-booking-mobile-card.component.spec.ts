import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentBookingMobileCardComponent, BookingDisplayItem } from './recent-booking-mobile-card.component';

describe('RecentBookingMobileCardComponent', () => {
  let component: RecentBookingMobileCardComponent;
  let fixture: ComponentFixture<RecentBookingMobileCardComponent>;

  const mockBooking: BookingDisplayItem = {
    id: '1', userName: 'Alice Johnson', serviceName: 'Haircut',
    appointmentDate: '2026-05-06T14:00:00Z', status: 'CONFIRMED',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentBookingMobileCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentBookingMobileCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('booking', mockBooking);
    fixture.componentRef.setInput('initials', 'AJ');
    fixture.componentRef.setInput('initialsBg', 'bg-accent-green/30 text-accent-green');
    fixture.componentRef.setInput('statusBadge', 'confirmed');
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should display user name', () => {
    expect(fixture.nativeElement.textContent).toContain('Alice Johnson');
  });
  it('[Red] should display service name', () => {
    expect(fixture.nativeElement.textContent).toContain('Haircut');
  });
  it('[Red] should display initials', () => {
    expect(fixture.nativeElement.textContent).toContain('AJ');
  });
  it('[Red] should render app-badge', () => {
    expect(fixture.nativeElement.querySelector('app-badge')).toBeTruthy();
  });
});
