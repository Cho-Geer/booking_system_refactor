import { Routes } from '@angular/router';
import { NotFoundPageComponent } from './shared/pages/not-found-page/not-found-page.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'booking',
    loadChildren: () =>
      import('./features/booking/booking.routes').then((m) => m.BOOKING_ROUTES),
  },
  {
    path: 'legal',
    loadChildren: () =>
      import('./features/legal/legal.routes').then((m) => m.LEGAL_ROUTES),
  },
  {
    path: '',
    redirectTo: 'booking',
    pathMatch: 'full',
  },
  // 404 - Wildcard route (must be last)
  {
    path: '**',
    component: NotFoundPageComponent,
  },
];
