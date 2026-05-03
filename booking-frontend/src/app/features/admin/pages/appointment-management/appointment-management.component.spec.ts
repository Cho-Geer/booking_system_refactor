import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppointmentManagementComponent } from './appointment-management.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminAppointment } from '../../dto/admin.dto';
import { of } from 'rxjs';

describe('AppointmentManagementComponent', () => {
  let component: AppointmentManagementComponent;
  let fixture: ComponentFixture<AppointmentManagementComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn(),
      getUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn(),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 10 })),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    TestBed.configureTestingModule({
      imports: [AppointmentManagementComponent],
      providers: [
        AdminStore,
        { provide: AdminService, useValue: mockAdminService },
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
    const appointments: AdminAppointment[] = [
      {
        id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
        serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
        appointmentDate: '2026-04-30T14:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
      },
    ];

    store.setAppointments(appointments, 1, 1);

    expect(component.vm().appointments.length).toBe(1);
    expect(component.vm().appointments[0].userName).toBe('Alice');
  });

  it('should handle selected appointments for batch operations', () => {
    const appt: AdminAppointment = {
      id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
      serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
      appointmentDate: '2026-04-30T14:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
    };

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
    const now = new Date();
    const todayStr = now.toISOString();
    const appointments: AdminAppointment[] = [
      {
        id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
        serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
        appointmentDate: todayStr, status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
      },
      {
        id: '2', appointmentNumber: 'APT-002', userId: 'u2', userName: 'Bob',
        serviceId: 'svc1', serviceName: 'Massage', timeSlotId: 'ts2',
        appointmentDate: todayStr, status: 'CONFIRMED', createdAt: '2026-04-28T10:00:00Z',
      },
      {
        id: '3', appointmentNumber: 'APT-003', userId: 'u3', userName: 'Carol',
        serviceId: 'svc2', serviceName: 'Facial', timeSlotId: 'ts3',
        appointmentDate: '2026-06-01T09:00:00Z', status: 'CANCELLED', createdAt: '2026-04-28T10:00:00Z',
      },
    ];
    store.setAppointments(appointments, 3, 1);

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
    const appt: AdminAppointment = {
      id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
      serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
      appointmentDate: '2026-04-30T14:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
    };

    component.openStatusDialog(appt);
    expect(component.statusDialogVisible()).toBe(true);
    expect(component.selectedAppointment()?.id).toBe('1');
    expect(component.newStatus()).toBe('PENDING');
  });

  it('[RED] should batch cancel selected appointments', () => {
    const appt1: AdminAppointment = {
      id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
      serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
      appointmentDate: '2026-04-30T14:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
    };
    const appt2: AdminAppointment = {
      id: '2', appointmentNumber: 'APT-002', userId: 'u2', userName: 'Bob',
      serviceId: 'svc1', serviceName: 'Massage', timeSlotId: 'ts2',
      appointmentDate: '2026-04-30T15:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
    };

    component.selectedAppointments.set([appt1, appt2]);
    mockAdminService.batchCancelAppointments.mockReturnValue(of({ successCount: 2, failedCount: 0, failedIds: [] }));

    component.batchCancel();

    expect(mockAdminService.batchCancelAppointments).toHaveBeenCalledWith({
      ids: ['1', '2'],
      reason: 'Admin batch cancel',
    });
  });

  it('[RED] should map appointment status to badge status correctly', () => {
    expect(component.getStatusSeverity('CONFIRMED')).toBe('success');
    expect(component.getStatusSeverity('PENDING')).toBe('warn');
    expect(component.getStatusSeverity('CANCELLED')).toBe('danger');
    expect(component.getStatusSeverity('COMPLETED')).toBe('info');
    expect(component.getStatusSeverity('EXPIRED')).toBeUndefined();
  });

  it('[RED] should get calendar events from appointments', () => {
    const appointments: AdminAppointment[] = [
      {
        id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
        serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
        appointmentDate: '2026-04-30T14:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
      },
    ];
    store.setAppointments(appointments, 1, 1);

    const events = component.calendarEvents();
    expect(events.length).toBe(1);
    expect(events[0].title).toContain('Haircut');
    expect(events[0].status).toBe('PENDING');
  });
});
