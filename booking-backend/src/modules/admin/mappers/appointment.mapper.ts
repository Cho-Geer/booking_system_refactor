import { AdminAppointmentDto } from '../dto/admin-appointment.dto';

interface PrismaAppointment {
  id: string;
  appointmentNumber: string;
  userId: string;
  serviceId: string;
  timeSlotId: string;
  appointmentDate: Date;
  status: string;
  durationMinutes?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  price?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taxRate?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taxIncludedAmount?: any;
  createdAt: Date;
  user?: { name: string };
  service?: { name: string; isActive?: boolean };
  timeSlot?: { startTime: Date; endTime: Date };
}

let appointmentCounter = 0;

export function generateAppointmentNumber(): string {
  appointmentCounter += 1;
  const ts = Date.now().toString(36).toUpperCase();
  return `APT-${ts}-${appointmentCounter.toString().padStart(4, '0')}`;
}

export function toAdminAppointmentDto(appt: PrismaAppointment): AdminAppointmentDto {
  return {
    id: appt.id,
    appointmentNumber: appt.appointmentNumber,
    userId: appt.userId,
    userName: appt.user?.name ?? 'Unknown',
    serviceId: appt.serviceId,
    serviceName: appt.service?.name ?? 'Unknown',
    timeSlotId: appt.timeSlotId,
    appointmentDate: appt.appointmentDate?.toISOString?.() ?? String(appt.appointmentDate),
    status: appt.status,
    durationMinutes: appt.durationMinutes ?? undefined,
    price: appt.price ? Number(appt.price) : undefined,
    taxRate: appt.taxRate ? Number(appt.taxRate) * 100 : undefined,
    taxIncludedAmount: appt.taxIncludedAmount ? Number(appt.taxIncludedAmount) : undefined,
    serviceActive: appt.service?.isActive ?? true,
    createdAt: appt.createdAt,
  };
}
