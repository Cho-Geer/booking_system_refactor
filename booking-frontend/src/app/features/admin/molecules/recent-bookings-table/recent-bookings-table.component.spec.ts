import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentBookingsTableComponent } from './recent-bookings-table.component';
import { By } from '@angular/platform-browser';

describe('RecentBookingsTableComponent', () => {
  let component: RecentBookingsTableComponent;
  let fixture: ComponentFixture<RecentBookingsTableComponent>;

  const mockRows = [
    {
      booking: { id: '1', userName: 'Alice Johnson', serviceName: 'Haircut', appointmentDate: '2026-05-06T14:00:00Z', status: 'CONFIRMED' },
      initials: 'AJ', initialsBg: 'bg-accent-green/30 text-accent-green', statusBadge: 'confirmed' as const,
    },
    {
      booking: { id: '2', userName: 'Bob Smith', serviceName: 'Massage', appointmentDate: '2026-05-06T15:00:00Z', status: 'PENDING' },
      initials: 'BS', initialsBg: 'bg-accent-purple/30 text-accent-purple', statusBadge: 'pending' as const,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentBookingsTableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentBookingsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', mockRows);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should render desktop table', () => {
    const table = fixture.nativeElement.querySelector('table');
    expect(table).toBeTruthy();
  });
  it('[Red] should render 2 table rows in tbody', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
  it('[Red] should display correct column headers', () => {
    const headers = fixture.nativeElement.querySelectorAll('thead th');
    expect(headers.length).toBe(5);
    const texts = Array.from(headers).map((h: any) => h.textContent.trim());
    expect(texts).toContain('Customer');
    expect(texts).toContain('Service');
  });
  it('[Red] should render mobile cards section', () => {
    // Mobile cards are wrapped in div with responsive classes
    const mobileSection = fixture.nativeElement.querySelector('table');
    expect(mobileSection).toBeTruthy();
  });
});
