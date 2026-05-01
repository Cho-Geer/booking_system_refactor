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
});
