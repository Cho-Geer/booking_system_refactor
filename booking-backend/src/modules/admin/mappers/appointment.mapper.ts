import { AdminAppointmentDto } from "../dto/admin-appointment.dto";

interface PrismaAppointment {
  id: string;
  userId: string;
  serviceId: string;
  timeSlotId: string;
  appointmentDate: Date;
  status: string;
  createdAt: Date;
  user?: { name: string };
  service?: { name: string };
  timeSlot?: { slotTime: string };
}

let appointmentCounter = 0;

function generateAppointmentNumber(): string {
  appointmentCounter += 1;
  const ts = Date.now().toString(36).toUpperCase();
  return `APT-${ts}-${appointmentCounter.toString().padStart(4, "0")}`;
}

export function toAdminAppointmentDto(appt: PrismaAppointment): AdminAppointmentDto {
  return {
    id: appt.id,
    appointmentNumber: generateAppointmentNumber(),
    userId: appt.userId,
    userName: appt.user?.name ?? "Unknown",
    serviceId: appt.serviceId,
    serviceName: appt.service?.name ?? "Unknown",
    timeSlotId: appt.timeSlotId,
    appointmentDate: appt.appointmentDate?.toISOString?.() ?? String(appt.appointmentDate),
    status: appt.status,
    createdAt: appt.createdAt,
  };
}
