import { Routes } from '@angular/router';
import { ServiceSelectionComponent } from './service-selection/service-selection.component';
import { TimeSlotPickerComponent } from './time-slot-picker/time-slot-picker.component';
import { BookingConfirmationComponent } from './booking-confirmation/booking-confirmation.component';
import { BookingSuccessComponent } from './booking-success/booking-success.component';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { canDeactivateBookingGuard } from '../../core/guards/can-deactivate-booking.guard';
import { serviceResolver } from '../../core/resolvers/service.resolver';
import { slotResolver } from '../../core/resolvers/slot.resolver';

const customerOnly = [authGuard, roleGuard({ deny: ['ADMIN', 'SUPER_ADMIN'], redirectTo: '/admin/dashboard' })];

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    component: ServiceSelectionComponent,
    canActivate: customerOnly,
    resolve: { services: serviceResolver },
  },
  {
    path: 'slots',
    component: TimeSlotPickerComponent,
    canActivate: customerOnly,
    canDeactivate: [canDeactivateBookingGuard],
    resolve: { slots: slotResolver },
  },
  {
    path: 'confirmation',
    component: BookingConfirmationComponent,
    canActivate: customerOnly,
    canDeactivate: [canDeactivateBookingGuard],
  },
  {
    path: 'success',
    component: BookingSuccessComponent,
    canActivate: customerOnly,
  },
];
