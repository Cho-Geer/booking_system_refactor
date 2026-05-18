import { toAdminAppointmentDto } from './appointment.mapper';

describe('appointment.mapper', () => {
  describe('toAdminAppointmentDto', () => {
    it('should include serviceActive when service.isActive is true', () => {
      const appt = {
        id: 'apt-001',
        appointmentNumber: 'APT-001',
        userId: 'user-001',
        serviceId: 'svc-001',
        timeSlotId: 'slot-001',
        appointmentDate: new Date('2026-05-17T10:00:00Z'),
        status: 'PENDING',
        createdAt: new Date(),
        user: { name: 'John' },
        service: { name: 'Consultation', isActive: true },
        timeSlot: { startTime: new Date(), endTime: new Date() },
      };

      const result = toAdminAppointmentDto(appt as any);

      expect(result.serviceActive).toBe(true);
    });

    it('should include serviceActive as false when service.isActive is false', () => {
      const appt = {
        id: 'apt-002',
        appointmentNumber: 'APT-002',
        userId: 'user-001',
        serviceId: 'svc-001',
        timeSlotId: 'slot-001',
        appointmentDate: new Date('2026-05-17T10:00:00Z'),
        status: 'PENDING',
        createdAt: new Date(),
        user: { name: 'John' },
        service: { name: 'Disabled Service', isActive: false },
        timeSlot: { startTime: new Date(), endTime: new Date() },
      };

      const result = toAdminAppointmentDto(appt as any);

      expect(result.serviceActive).toBe(false);
    });

    it('should default serviceActive to true when service is undefined', () => {
      const appt = {
        id: 'apt-003',
        appointmentNumber: 'APT-003',
        userId: 'user-001',
        serviceId: 'svc-001',
        timeSlotId: 'slot-001',
        appointmentDate: new Date('2026-05-17T10:00:00Z'),
        status: 'PENDING',
        createdAt: new Date(),
      };

      const result = toAdminAppointmentDto(appt as any);

      expect(result.serviceActive).toBe(true);
    });
  });
});
