/**
 * Time Slot DTOs
 * 与 backend-api 契约保持一致
 * @see contract.yaml -> api.time_slots
 */

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  available: boolean;
  maxOvertimeMinutes?: number;
}

export interface AvailableTimeSlotsQuery {
  serviceId: string;
  startDate: string;
  endDate: string;
}

export type AvailableTimeSlotsResponse = TimeSlot[];
