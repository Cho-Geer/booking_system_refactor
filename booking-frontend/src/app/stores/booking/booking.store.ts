import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TimeSlot } from '../../shared/dto/time-slot.dto';
import { ReservationResponse, BookingListItem } from '../../shared/dto/booking.dto';
import { Service } from '../../shared/dto/service.dto';

export interface BookingState {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  selectedServiceId: string | null;
  isLoading: boolean;
  error: string | null;
  activeBookings: string[];
  services: Service[];
  bookings: BookingListItem[];
}

export const initialBookingState: BookingState = {
  slots: [],
  selectedSlot: null,
  selectedServiceId: null,
  isLoading: false,
  error: null,
  activeBookings: [],
  services: [],
  bookings: [],
};

export const BookingStore = signalStore(
  { providedIn: 'root' },
  withState<BookingState>(initialBookingState),
  withComputed(({ slots, selectedSlot, activeBookings, services, bookings }) => ({
    availableSlots: computed(() => slots().filter(slot => slot.available)),
    bookedSlots: computed(() => slots().filter(slot => !slot.available)),
    hasSelection: computed(() => selectedSlot() !== null),
  })),
  withMethods((store, apiService = inject(ApiService)) => ({
    loadSlots(slots: TimeSlot[]) {
      patchState(store, {
        slots,
        isLoading: false,
        error: null,
      });
    },
    selectSlot(slot: TimeSlot | null) {
      patchState(store, { selectedSlot: slot });
    },
    setSelectedServiceId(serviceId: string | null) {
      patchState(store, { selectedServiceId: serviceId });
    },
    bookSlot(slotId: string, userId: string) {
      const currentSlots = store.slots();
      const updatedSlots = currentSlots.map(slot =>
        slot.id === slotId
          ? { ...slot, available: false, bookedBy: userId }
          : slot
      );

      patchState(store, {
        slots: updatedSlots as TimeSlot[],
        activeBookings: [...store.activeBookings(), slotId],
        selectedSlot: null,
        isLoading: false,
        error: null,
      });
    },
    cancelBooking(slotId: string) {
      const currentSlots = store.slots();
      const updatedSlots = currentSlots.map(slot =>
        slot.id === slotId
          ? { ...slot, available: true, bookedBy: undefined }
          : slot
      );

      patchState(store, {
        slots: updatedSlots as TimeSlot[],
        activeBookings: store.activeBookings().filter(id => id !== slotId),
        isLoading: false,
        error: null,
      });
    },
    setLoading(isLoading: boolean) {
      patchState(store, { isLoading });
    },
    setError(error: string | null) {
      patchState(store, { error, isLoading: false });
    },
    reserveSlot(params: { slotId: string; preferSeq: number }): ReservationResponse {
      const currentSlots = store.slots();
      const targetSlot = currentSlots.find(slot => slot.id === params.slotId);

      if (!targetSlot || !targetSlot.available) {
        return {
          status: 'FAILED',
          slot: targetSlot ?? { id: params.slotId, startTime: '', endTime: '', capacity: 0, bookedCount: 0, available: false },
          message: 'Slot is no longer available',
        };
      }

      const updatedSlots = currentSlots.map(slot =>
        slot.id === params.slotId
          ? { ...slot, available: false }
          : slot
      );

      patchState(store, {
        slots: updatedSlots,
        isLoading: false,
        error: null,
      });

      return {
        status: 'SUCCESS',
        slot: { ...targetSlot, available: false },
      };
    },

    /**
     * Confirm a slot reservation after successful API call.
     * Marks the slot as booked and adds to activeBookings.
     */
    confirmSlotReservation(slotId: string): void {
      const currentSlots = store.slots();
      const updatedSlots = currentSlots.map(slot =>
        slot.id === slotId
          ? { ...slot, available: false }
          : slot
      );

      patchState(store, {
        slots: updatedSlots,
        activeBookings: [...store.activeBookings(), slotId],
        selectedSlot: null,
        isLoading: false,
        error: null,
      });
    },

    /**
     * Handle a failed reservation after API call error.
     * Restores the slot to active state and records the error.
     */
    failedReservation(slotId: string, error: string): void {
      const currentSlots = store.slots();
      const updatedSlots = currentSlots.map(slot =>
        slot.id === slotId
          ? { ...slot, available: true }
          : slot
      );

      patchState(store, {
        slots: updatedSlots,
        error,
        isLoading: false,
      });
    },

    // ==========================================
    // Async API methods
    // ==========================================

    /**
     * Load services list from API.
     */
    async loadServices(): Promise<Service[]> {
      patchState(store, { isLoading: true, error: null });
      try {
        const services = await lastValueFrom(apiService.getServices());
        patchState(store, { services, isLoading: false });
        return services;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load services';
        patchState(store, { error: message, isLoading: false });
        return [];
      }
    },

    /**
     * Load available time slots for a service from API.
     */
    async loadTimeSlots(serviceId: string): Promise<TimeSlot[]> {
      patchState(store, { isLoading: true, error: null });
      try {
        const slots = await lastValueFrom(apiService.getAvailableSlots(serviceId));
        patchState(store, { slots, isLoading: false });
        return slots;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load time slots';
        patchState(store, { error: message, isLoading: false });
        return [];
      }
    },

    /**
     * Create an appointment via API.
     * Returns ReservationResponse indicating success or failure.
     */
    async createAppointment(dto: {
      timeSlotId: string;
      serviceId: string;
      appointmentDate: string;
      preferredSequence: number;
      customerInfo?: Record<string, unknown>;
      notes?: string;
    }): Promise<ReservationResponse> {
      patchState(store, { isLoading: true, error: null });
      try {
        const response = await lastValueFrom(apiService.createAppointment(dto));
        patchState(store, { isLoading: false });
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create appointment';
        patchState(store, { error: message, isLoading: false });
        return {
          status: 'FAILED',
          slot: { id: '', startTime: '', endTime: '', capacity: 0, bookedCount: 0, available: true },
          message,
        };
      }
    },

    /**
     * Fetch current user's bookings from API.
     */
    async fetchMyBookings(query?: {
      startDate?: string;
      endDate?: string;
      status?: string;
    }): Promise<BookingListItem[]> {
      patchState(store, { isLoading: true, error: null });
      try {
        const bookings = await lastValueFrom(apiService.getMyAppointments(query));
        patchState(store, { bookings, isLoading: false });
        return bookings;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch bookings';
        patchState(store, { error: message, isLoading: false });
        return [];
      }
    },

    /**
     * Cancel a booking via API and remove from local list.
     */
    async cancelMyBooking(bookingId: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await lastValueFrom(apiService.cancelBooking(bookingId));
        const updatedBookings = store.bookings().filter(b => b.id !== bookingId);
        patchState(store, { bookings: updatedBookings, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel booking';
        patchState(store, { error: message, isLoading: false });
      }
    },
  }))
);
