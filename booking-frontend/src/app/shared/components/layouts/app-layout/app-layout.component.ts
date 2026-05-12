import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs/operators';
import { AuthStore } from '../../../../stores/auth/auth.store';
import { ApiService } from '../../../../core/services/api.service';
import { SocketService } from '../../../../core/services/socket.service';
import { AdminStore } from '../../../../features/admin/stores/admin.store';
import { AppHeaderComponent, NavLink } from '../app-header/app-header.component';
import { AppSidebarComponent, SidebarItem, SidebarSection } from '../app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent implements OnInit {
  private authStore = inject(AuthStore);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private socketService = inject(SocketService);
  private adminStore = inject(AdminStore);

  readonly user = this.authStore.currentUser;
  readonly isAuthenticated = this.authStore.isAuthenticated;

  readonly userName = computed(() => this.user()?.name);
  readonly userRole = computed(() => this.user()?.userType);
  readonly isAdmin = computed(
    () => this.userRole() === 'ADMIN' || this.userRole() === 'SUPER_ADMIN',
  );

  readonly currentUrl = signal(this.router.url);
  readonly isAdminRoute = computed(() => this.currentUrl().startsWith('/admin'));

  readonly notificationCount = computed(() => {
    if (!this.isAdminRoute()) return 0;
    return this.adminStore.unreadCount();
  });

  readonly navLinks = computed<NavLink[]>(() => {
    if (this.isAdmin()) {
      return [
        { label: 'Dashboard', route: '/admin/dashboard', icon: 'pi pi-chart-bar' },
        { label: 'Booking', route: '/booking/services', icon: 'pi pi-calendar' },
        { label: 'My Bookings', route: '/my-bookings', icon: 'pi pi-list' },
        { label: 'Profile', route: '/profile', icon: 'pi pi-user' },
      ];
    }
    return [
      { label: 'Booking', route: '/booking/services', icon: 'pi pi-calendar' },
      { label: 'My Bookings', route: '/my-bookings', icon: 'pi pi-list' },
      { label: 'Profile', route: '/profile', icon: 'pi pi-user' },
    ];
  });

  /** Sidebar items for customer (non-admin) users */
  readonly customerSidebarItems: SidebarItem[] = [
    { label: '预约服务', route: '/booking/services', icon: 'pi pi-calendar' },
    { label: '我的预约', route: '/my-bookings', icon: 'pi pi-list' },
    { label: '个人资料', route: '/profile', icon: 'pi pi-user' },
  ];

  /** Sidebar items for admin users */
  readonly adminSidebarItems: SidebarItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'pi pi-chart-bar' },
    { label: 'Appointments', route: '/admin/appointments', icon: 'pi pi-calendar' },
    { label: 'Users', route: '/admin/users', icon: 'pi pi-users' },
    { label: 'Services', route: '/admin/services', icon: 'pi pi-briefcase' },
    { label: 'Analytics', route: '/admin/analytics', icon: 'pi pi-chart-line' },
    { label: 'History', route: '/admin/history', icon: 'pi pi-history' },
    { label: 'Settings', route: '/admin/settings', icon: 'pi pi-cog' },
  ];

  readonly sidebarItems = computed<SidebarItem[]>(() => {
    if (this.isAdmin()) {
      return this.adminSidebarItems;
    }
    return this.customerSidebarItems;
  });

  readonly sidebarSections = computed<SidebarSection[]>(() => {
    return [];
  });

  /** Whether sidebar should use solid (non-transparent) background */
  readonly sidebarSolid = computed(() => this.isAdminRoute());

  /** Whether to show search bar in header */
  readonly showSearchInHeader = computed(() => !this.isAdminRoute());

  readonly menuItems = computed<MenuItem[]>(() => [
    {
      label: this.userName() ?? 'User',
      items: [
        {
          label: '个人资料',
          icon: 'pi pi-user',
          routerLink: '/profile',
        },
        {
          label: '安全设置',
          icon: 'pi pi-lock',
          command: () => this.router.navigate(['/profile']),
        },
        { separator: true },
        {
          label: '退出登录',
          icon: 'pi pi-sign-out',
          command: () => this.onLogout(),
        },
      ],
    },
  ]);

  sidebarOpen = false;

  onMenuToggle(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  async onLogout(): Promise<void> {
    await this.authStore.logout();
    await this.router.navigate(['/auth/login']);
  }

  async ngOnInit(): Promise<void> {
    // Track current route for admin mode detection
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    // Attempt to restore session via HttpOnly refresh cookie on app boot
    if (!this.isAuthenticated()) {
      await this.authStore.restoreSession();
    }
  }
}
