import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';

/**
 * Service interface representing a bookable time slot.
 * TODO: Move this interface to a shared DTO file once the API service is created.
 */
export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  isActive: boolean;
  bookedBy?: string;
}

/**
 * Functional resolver that returns a list of available time slots for a given date.
 *
 * Reads an optional `date` parameter from the route. Defaults to today's date
 * if no date is provided.
 *
 * Currently returns static sample data since no backend API exists yet.
 * TODO: Replace with actual API call once the backend endpoint is available.
 *
 * Example implementation with API:
 * ```typescript
 * const slotService = inject(SlotService);
 * const date = route.paramMap.get('date') ?? today;
 * return slotService.getTimeSlots(date);
 * ```
 */
export const slotResolver: ResolveFn<TimeSlot[]> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  // TODO: Replace with actual API call once backend endpoint is available
  // const slotService = inject(SlotService);
  // const date = route.paramMap.get('date') ?? getTodayDateString();
  // return slotService.getTimeSlots(date);

  const date = (route.paramMap.get('date') as string | null) ?? getTodayDateString();

  const sampleSlots: TimeSlot[] = [
    {
      id: `slot-${date}-0900`,
      date,
      time: '09:00',
      isActive: true,
    },
    {
      id: `slot-${date}-1000`,
      date,
      time: '10:00',
      isActive: true,
    },
    {
      id: `slot-${date}-1100`,
      date,
      time: '11:00',
      isActive: true,
      bookedBy: 'user-042',
    },
    {
      id: `slot-${date}-1400`,
      date,
      time: '14:00',
      isActive: true,
    },
    {
      id: `slot-${date}-1500`,
      date,
      time: '15:00',
      isActive: false,
    },
    {
      id: `slot-${date}-1600`,
      date,
      time: '16:00',
      isActive: true,
      bookedBy: 'user-108',
    },
  ];

  return of(sampleSlots);
};

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
