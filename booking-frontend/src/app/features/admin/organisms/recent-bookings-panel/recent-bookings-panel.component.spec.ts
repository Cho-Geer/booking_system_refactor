import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentBookingsPanelComponent } from './recent-bookings-panel.component';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

describe('RecentBookingsPanelComponent', () => {
  let component: RecentBookingsPanelComponent;
  let fixture: ComponentFixture<RecentBookingsPanelComponent>;

  const mockRows = [
    {
      booking: { id: '1', userName: 'Alice Johnson', serviceName: 'Haircut', appointmentDate: '2026-05-06T14:00:00Z', status: 'CONFIRMED' },
      initials: 'AJ', initialsBg: 'bg-accent-green/30 text-accent-green', statusBadge: 'confirmed' as const,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentBookingsPanelComponent, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentBookingsPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', mockRows);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should display "Recent Appointments" heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Recent Appointments');
  });
  it('[Red] should have "View All" link', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('View All');
  });
  it('[Red] should render recent-bookings-table', () => {
    expect(fixture.nativeElement.querySelector('app-recent-bookings-table')).toBeTruthy();
  });
});
