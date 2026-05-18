import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickBookingFormComponent } from './quick-booking-form.component';
import { By } from '@angular/platform-browser';
import { AdminService } from '../../services/admin.service';
import { ApiService } from '../../../../core/services/api.service';
import { of } from 'rxjs';

describe('QuickBookingFormComponent', () => {
  let component: QuickBookingFormComponent;
  let fixture: ComponentFixture<QuickBookingFormComponent>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getUsers: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 100 })),
      getAdminServices: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 100 })),
      createAdminAppointment: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    await TestBed.configureTestingModule({
      imports: [QuickBookingFormComponent],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: ApiService, useValue: { getAvailableSlots: jest.fn().mockReturnValue(of([])) } },
      ],
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

  // ==========================================
  // [RED] Service filter fix — active: true
  // ==========================================

  it('[RED] should load only active services via getAdminServices on init', () => {
    expect(mockAdminService.getAdminServices).toHaveBeenCalledWith({
      limit: 100,
      page: 1,
      active: true,
    });
  });
});
