import { Routes } from '@angular/router';
import { MyBookingsComponent } from './my-bookings.component';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const MY_BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    component: MyBookingsComponent,
    canActivate: [authGuard, roleGuard({ deny: ['ADMIN', 'SUPER_ADMIN'], redirectTo: '/admin/dashboard' })],
  },
];
