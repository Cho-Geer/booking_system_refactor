import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard({ allow: ['ADMIN', 'SUPER_ADMIN'] })],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/service-management/service-management.component').then(m => m.ServiceManagementComponent),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./pages/appointment-management/appointment-management.component').then(m => m.AppointmentManagementComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
