import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AppointmentManagementComponent,
  toLocalDateString,
} from './appointment-management.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { ApiService } from '../../../../core/services/api.service';
import { AdminAppointment, BatchCancelResponse, BusinessHoursDto } from '../../dto/admin.dto';
import { of } from 'rxjs';

describe('AppointmentManagementComponent', () => {
  let component: AppointmentManagementComponent;
  let fixture: ComponentFixture<AppointmentManagementComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  const defaultBusinessHours: BusinessHoursDto = {
    timezone: 'Asia/Shanghai',
    monday: [{ open: '09:00', close: '17:00' }],
    tuesday: [{ open: '09:00', close: '17:00' }],
    wednesday: [{ open: '09:00', close: '17:00' }],
    thursday: [{ open: '09:00', close: '17:00' }],
    friday: [{ open: '09:00', close: '17:00' }],
    saturday: [{ open: '09:00', close: '17:00' }],
    sunday: [],
    updatedAt: '2026-05-01T00:00:00Z',
  };

  const makeAppointment = (overrides: Partial<AdminAppointment> = {}): AdminAppointment => ({
    id: '1',
    appointmentNumber: 'APT-001',
    userId: 'u1',
    userName: 'Alice',
    serviceId: 'svc1',
    serviceName: 'Haircut',
    serviceActive: true,
    timeSlotId: 'ts1',
    appointmentDate: '2026-04-30T14:00:00Z',
    status: 'PENDING',
    createdAt: '2026-04-28T10:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn(),
      getUsers: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 10 })),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 10 })),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest
        .fn()
        .mockReturnValue(of({ items: [], total: 0, page: 1, limit: 10 })),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
      createAdminAppointment: jest.fn(),
      getBusinessHours: jest.fn().mockReturnValue(of(defaultBusinessHours)),
      getServiceAffectedAppointments: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    TestBed.configureTestingModule({
      imports: [AppointmentManagementComponent],
      providers: [
        AdminStore,
        { provide: AdminService, useValue: mockAdminService },
        { provide: ApiService, useValue: { getAvailableSlots: jest.fn().mockReturnValue(of([])) } },
      ],
    });

    fixture = TestBed.createComponent(AppointmentManagementComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(AdminStore);
    // First detectChanges triggers ngOnInit
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty appointments', () => {
    expect(component.vm().appointments.length).toBe(0);
  });

  it('should display appointments from store', () => {
    const appointments: AdminAppointment[] = [makeAppointment()];

    store.setAppointments(appointments, 1, 1);

    expect(component.vm().appointments.length).toBe(1);
    expect(component.vm().appointments[0].userName).toBe('Alice');
  });

  it('should handle selected appointments for batch operations', () => {
    const appt = makeAppointment();

    component.selectedAppointments.set([appt]);
    expect(component.selectedAppointments().length).toBe(1);
  });

  it('should load appointments on init', () => {
    expect(mockAdminService.getAdminAppointments).toHaveBeenCalled();
  });

  // ==========================================
  // [RED] Enhanced tests for redesigned features
  // ==========================================

  it('[RED] should compute stats from appointments list', () => {
    const todayLocalStr = toLocalDateString(new Date());
    const todayDateStr = `${todayLocalStr}T12:00:00.000Z`;
    const appointments: AdminAppointment[] = [
      makeAppointment({ id: '1', appointmentDate: todayDateStr, status: 'PENDING', userName: 'Alice' }),
      makeAppointment({ id: '2', appointmentDate: todayDateStr, status: 'CONFIRMED', userName: 'Bob', serviceName: 'Massage' }),
      makeAppointment({ id: '3', appointmentDate: '2026-06-01T09:00:00Z', status: 'CANCELLED', userName: 'Carol', serviceName: 'Facial', serviceId: 'svc2' }),
    ];
    store.setAppointments(appointments, 3, 1);
    store.setAllAppointmentsForStats(appointments);

    expect(component.todayCount()).toBe(2);
    expect(component.pendingCount()).toBe(1);
    expect(component.confirmedCount()).toBe(1);
    expect(component.cancelledCount()).toBe(1);
  });

  it('[RED] should toggle view mode between calendar and list', () => {
    expect(component.viewMode()).toBe('list');

    component.toggleView('calendar');
    expect(component.viewMode()).toBe('calendar');

    component.toggleView('list');
    expect(component.viewMode()).toBe('list');
  });

  it('[RED] should clear all filters when clearFilters is called', () => {
    component.filterStatus.set('PENDING');
    component.filterSearch.set('Alice');
    component.filterStartDate.set(new Date('2026-05-01'));
    component.filterEndDate.set(new Date('2026-05-31'));

    component.clearFilters();

    expect(component.filterStatus()).toBe('');
    expect(component.filterSearch()).toBe('');
    expect(component.filterStartDate()).toBeUndefined();
    expect(component.filterEndDate()).toBeUndefined();
  });

  it('[RED] should open status update dialog for an appointment', () => {
    const appt = makeAppointment();

    component.openStatusDialog(appt);
    expect(component.statusDialogVisible()).toBe(true);
    expect(component.selectedAppointment()?.id).toBe('1');
    expect(component.newStatus()).toBe('PENDING');
  });

  it('[RED] should open batch cancel dialog and clear reason', () => {
    component.batchCancelReason.set('old reason');
    component.openBatchCancelDialog();

    expect(component.batchCancelDialogVisible()).toBe(true);
    expect(component.batchCancelReason()).toBe('');
  });

  it('[RED] should call batchCancelAppointments with user reason on confirmBatchCancel', () => {
    const appt1 = makeAppointment({ appointmentNumber: 'APT-001', userName: 'Alice' });
    const appt2 = makeAppointment({ id: '2', appointmentNumber: 'APT-002', userName: 'Bob', serviceName: 'Massage', timeSlotId: 'ts2', appointmentDate: '2026-04-30T15:00:00Z' });

    component.selectedAppointments.set([appt1, appt2]);
    component.batchCancelReason.set('Customer requested cancel');
    mockAdminService.batchCancelAppointments.mockReturnValue(
      of({ successCount: 2, failedCount: 0, failedIds: [] }),
    );

    component.confirmBatchCancel();

    expect(mockAdminService.batchCancelAppointments).toHaveBeenCalledWith({
      ids: ['1', '2'],
      reason: 'Customer requested cancel',
    });
  });

  it('[RED] should handle partial failures in confirmBatchCancel', () => {
    const appt1 = makeAppointment({ appointmentNumber: 'APT-001', userName: 'Alice' });
    const appt2 = makeAppointment({ id: '2', appointmentNumber: 'APT-002', userName: 'Bob', serviceName: 'Massage', timeSlotId: 'ts2', appointmentDate: '2026-04-30T15:00:00Z' });
    const appt3 = makeAppointment({ id: '3', appointmentNumber: 'APT-003', userName: 'Carol', serviceName: 'Facial', serviceId: 'svc2', timeSlotId: 'ts3', appointmentDate: '2026-06-01T09:00:00Z' });

    // Set appointments in the store
    store.setAppointments([appt1, appt2, appt3], 3, 1);
    component.selectedAppointments.set([appt1, appt2, appt3]);

    // Mock response: appt2 failed
    const response: BatchCancelResponse = {
      successCount: 2,
      failedCount: 1,
      failedIds: ['2'],
    };
    mockAdminService.batchCancelAppointments.mockReturnValue(of(response));

    component.confirmBatchCancel();

    // Should remove only successfully cancelled IDs (1 and 3), not the failed one (2)
    expect(store.appointments().length).toBe(1);
    expect(store.appointments()[0].id).toBe('2');
    // Should show error with failure summary
    expect(component.vm().error).toContain('1 appointment(s) failed');
    // Dialog should close
    expect(component.batchCancelDialogVisible()).toBe(false);
    // Selection should be cleared
    expect(component.selectedAppointments().length).toBe(0);
  });

  it('[RED] should handle all failures in confirmBatchCancel — remove nothing', () => {
    const appt1 = makeAppointment({ appointmentNumber: 'APT-001', userName: 'Alice' });
    const appt2 = makeAppointment({ id: '2', appointmentNumber: 'APT-002', userName: 'Bob', serviceName: 'Massage', timeSlotId: 'ts2', appointmentDate: '2026-04-30T15:00:00Z' });

    store.setAppointments([appt1, appt2], 2, 1);
    component.selectedAppointments.set([appt1, appt2]);

    const response: BatchCancelResponse = {
      successCount: 0,
      failedCount: 2,
      failedIds: ['1', '2'],
    };
    mockAdminService.batchCancelAppointments.mockReturnValue(of(response));

    component.confirmBatchCancel();

    // Nothing should be removed
    expect(store.appointments().length).toBe(2);
    expect(component.vm().error).toContain('2 appointment(s) failed');
  });

  it('[RED] should close dialog and clear selection on confirmBatchCancel success', () => {
    const appt1 = makeAppointment();

    store.setAppointments([appt1], 1, 1);
    component.selectedAppointments.set([appt1]);
    component.batchCancelDialogVisible.set(true);
    mockAdminService.batchCancelAppointments.mockReturnValue(
      of({ successCount: 1, failedCount: 0, failedIds: [] }),
    );

    component.confirmBatchCancel();

    expect(component.batchCancelDialogVisible()).toBe(false);
    expect(component.selectedAppointments().length).toBe(0);
  });

  it('[RED] should map appointment status to badge status correctly', () => {
    expect(component.getStatusSeverity('CONFIRMED')).toBe('success');
    expect(component.getStatusSeverity('PENDING')).toBe('warn');
    expect(component.getStatusSeverity('CANCELLED')).toBe('danger');
    expect(component.getStatusSeverity('COMPLETED')).toBe('info');
    expect(component.getStatusSeverity('EXPIRED')).toBeUndefined();
  });

  it('[RED] should get calendar events from appointments', () => {
    const appt = makeAppointment();
    store.setAppointments([appt], 1, 1);
    store.setAllAppointmentsForStats([appt]);

    const events = component.calendarEvents();
    expect(events.length).toBe(1);
    expect(events[0].title).toContain('Haircut');
    expect(events[0].status).toBe('PENDING');
  });

  // ==========================================
  // [RED] Service filter fix — active: true
  // ==========================================

  it('[RED] should load only active services via getAdminServices', () => {
    expect(mockAdminService.getAdminServices).toHaveBeenCalledWith({
      limit: 999,
      page: 1,
      active: true,
    });
  });

  // ==========================================
  // [RED] Closed Days / Business Hours
  // ==========================================

  it('[RED] should fetch business hours when booking dialog opens', () => {
    mockAdminService.getBusinessHours.mockClear();
    component.openBooking();

    expect(mockAdminService.getBusinessHours).toHaveBeenCalled();
  });

  it('[RED] should compute disabledDays from empty business-hours day arrays', () => {
    // Sunday (index 0) has empty array → should be disabled
    const businessHours: BusinessHoursDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [{ open: '09:00', close: '17:00' }],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [{ open: '09:00', close: '17:00' }],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: [],
      updatedAt: '2026-05-01T00:00:00Z',
    };

    (component as any).businessHours.set(businessHours);
    fixture.detectChanges();

    expect(component.disabledDays()).toEqual([0]); // Sunday = 0
  });

  it('[RED] should compute disabledDays with multiple closed days', () => {
    const businessHours: BusinessHoursDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: [],
      updatedAt: '2026-05-01T00:00:00Z',
    };

    (component as any).businessHours.set(businessHours);
    fixture.detectChanges();

    expect(component.disabledDays()).toEqual([0, 2, 5]); // Sunday=0, Tuesday=2, Friday=5
  });

  it('[RED] should return empty disabledDays when all days have business hours', () => {
    const businessHours: BusinessHoursDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [{ open: '09:00', close: '17:00' }],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [{ open: '09:00', close: '17:00' }],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: [{ open: '09:00', close: '17:00' }],
      updatedAt: '2026-05-01T00:00:00Z',
    };

    (component as any).businessHours.set(businessHours);
    fixture.detectChanges();

    expect(component.disabledDays()).toEqual([]);
  });

  it('[RED] should detect businessClosedOnDate when selected date is a closed day', () => {
    const businessHours: BusinessHoursDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [{ open: '09:00', close: '17:00' }],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [{ open: '09:00', close: '17:00' }],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: [], // Sunday is closed
      updatedAt: '2026-05-01T00:00:00Z',
    };

    (component as any).businessHours.set(businessHours);
    // 2026-05-31 is a Sunday
    const sundayDate = new Date('2026-05-31T00:00:00');
    component.formAppointmentDate.set(sundayDate);
    fixture.detectChanges();

    expect(component.businessClosedOnDate()).toBe(true);
  });

  it('[RED] should detect businessClosedOnDate is false for an open day', () => {
    const businessHours: BusinessHoursDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [{ open: '09:00', close: '17:00' }],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: [],
      updatedAt: '2026-05-01T00:00:00Z',
    };

    (component as any).businessHours.set(businessHours);
    // 2026-06-01 is a Monday (open)
    const mondayDate = new Date('2026-06-01T00:00:00');
    component.formAppointmentDate.set(mondayDate);
    fixture.detectChanges();

    expect(component.businessClosedOnDate()).toBe(false);
  });

  it('[RED] should show businessClosedOnDate as false when date is undefined', () => {
    const businessHours: BusinessHoursDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [{ open: '09:00', close: '17:00' }],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [{ open: '09:00', close: '17:00' }],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: [],
      updatedAt: '2026-05-01T00:00:00Z',
    };

    (component as any).businessHours.set(businessHours);
    component.formAppointmentDate.set(undefined);
    fixture.detectChanges();

    expect(component.businessClosedOnDate()).toBe(false);
  });

  // ==========================================
  // [RED] Date Timezone Fix — toLocalDateString
  // ==========================================

  it('[RED] toLocalDateString should return correct local date for June 1 2026', () => {
    const date = new Date(2026, 5, 1); // June 1, 2026 local time
    expect(toLocalDateString(date)).toBe('2026-06-01');
  });

  it('[RED] loadAvailableTimeSlots should use local date string not UTC shifted', () => {
    const juneFirst = new Date(2026, 5, 1); // June 1, 2026 local time
    component.formAppointmentDate.set(juneFirst);
    component.formServiceId.set('svc1');
    const apiService = TestBed.inject(ApiService);
    const apiSpy = jest.spyOn(apiService, 'getAvailableSlots');

    // onDateChange triggers loadAvailableTimeSlots (private, called via public method)
    component.onDateChange();

    expect(apiSpy).toHaveBeenCalledWith('svc1', '2026-06-01', '2026-06-01');
  });

  it('[RED] saveBooking should use local date not UTC shifted date', () => {
    const juneFirst = new Date(2026, 5, 1); // June 1, 2026 local time
    component.formUserId.set('u1');
    component.formServiceId.set('svc1');
    component.formAppointmentDate.set(juneFirst);
    component.formTimeSlotId.set('ts1');
    component.formNotes.set('Test booking');

    // Mock createAdminAppointment to return an observable
    mockAdminService.createAdminAppointment.mockReturnValue(of({ id: 'new-appt' }));

    component.saveBooking();

    expect(mockAdminService.createAdminAppointment).toHaveBeenCalled();
    const callArg = (mockAdminService.createAdminAppointment as jest.Mock).mock.calls[0][0];
    // Should contain local date, not UTC-shifted May 31
    expect(callArg.appointmentDate).toContain('2026-06-01');
  });

  // ==========================================
  // [Red] Service Status Indicator — Inactive Badge
  // ==========================================

  it('[Red] should show serviceActive field as true for active services', () => {
    const appt = makeAppointment({ serviceActive: true });
    expect(appt.serviceActive).toBe(true);
  });

  it('[Red] should show serviceActive field as false for inactive services', () => {
    const appt = makeAppointment({ serviceActive: false });
    expect(appt.serviceActive).toBe(false);
  });

  it('[Red] should render inactive badge for appointments with inactive service', () => {
    const appt = makeAppointment({ id: '2', serviceActive: false, serviceName: 'Old Massage' });
    store.setAppointments([appt], 1, 1);
    store.setAllAppointmentsForStats([appt]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    // The template should show "⚠️ Inactive" badge when serviceActive is false
    expect(el.textContent).toContain('Inactive');
  });

  it('[Red] should NOT render inactive badge when serviceActive is true', () => {
    const appt = makeAppointment({ serviceActive: true });
    store.setAppointments([appt], 1, 1);
    store.setAllAppointmentsForStats([appt]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Inactive');
  });

  // ==========================================
  // [Red] Cost Display — Direct value binding
  // ==========================================

  it('[Red] should compute estTotalCost correctly for a selected service', () => {
    component.formSelectedServiceData.set({
      id: 'svc1', name: 'Test', description: '', duration: 60, price: 120,
      pricePerMinute: 2, taxRate: 8, active: true, createdAt: '2026-01-01T00:00:00Z',
    });
    const cost = component.estTotalCost();
    expect(cost).not.toBeNull();
    expect(cost!.totalMinutes).toBe(60);
    expect(cost!.baseCost).toBe(120);
    expect(cost!.tax).toBe(9.6); // 120 * 0.08
    expect(cost!.total).toBe(129.6);
  });

  it('[Red] should reflect overtime in estTotalCost', () => {
    component.formSelectedServiceData.set({
      id: 'svc1', name: 'Test', description: '', duration: 30, price: 30,
      pricePerMinute: 1, taxRate: 10, active: true, createdAt: '2026-01-01T00:00:00Z',
    });
    component.formOvertimeMinutes.set(15);
    const cost = component.estTotalCost();
    expect(cost!.totalMinutes).toBe(45); // 30 + 15
    expect(cost!.baseCost).toBe(45); // 45 * 1
    expect(cost!.tax).toBe(4.5); // 45 * 0.1
    expect(cost!.total).toBe(49.5);
  });

  it('[Red] filter dates in loadAppointments should use local date strings', () => {
    const juneFirst = new Date(2026, 5, 1); // June 1, 2026 local time
    const juneThirty = new Date(2026, 5, 30); // June 30, 2026 local time
    component.filterStartDate.set(juneFirst);
    component.filterEndDate.set(juneThirty);

    // Clear the initial call from ngOnInit
    mockAdminService.getAdminAppointments.mockClear();
    component.loadAppointments(true);

    expect(mockAdminService.getAdminAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      }),
    );
  });
});
