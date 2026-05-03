import { Routes } from '@angular/router';
import { NotFoundPageComponent } from './shared/pages/not-found-page/not-found-page.component';
import { AppLayoutComponent } from './shared/components/layouts/app-layout/app-layout.component';

export const routes: Routes = [
  // Public routes (no layout — standalone pages with their own design)
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'legal',
    loadChildren: () =>
      import('./features/legal/legal.routes').then((m) => m.LEGAL_ROUTES),
  },

  // Authenticated routes (wrapped in AppLayoutComponent with header + sidebar)
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'booking',
        loadChildren: () =>
          import('./features/booking/booking.routes').then((m) => m.BOOKING_ROUTES),
      },
      {
        path: 'my-bookings',
        loadChildren: () =>
          import('./features/my-bookings/my-bookings.routes').then((m) => m.MY_BOOKINGS_ROUTES),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: '',
        redirectTo: 'booking',
        pathMatch: 'full',
      },
    ],
  },

  // 404 - Wildcard route (must be last, outside layout — no header on 404 page)
  {
    path: '**',
    component: NotFoundPageComponent,
  },
];
