import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs/operators';
import { AuthStore } from '../../../../stores/auth/auth.store';
import { ApiService } from '../../../../core/services/api.service';
import { SocketService } from '../../../../core/services/socket.service';
import { AppHeaderComponent, NavLink } from '../app-header/app-header.component';
import { AppSidebarComponent, SidebarItem, SidebarSection } from '../app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NgClass, AppHeaderComponent, AppSidebarComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent implements OnInit {
  private authStore = inject(AuthStore);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private socketService = inject(SocketService);

  readonly user = this.authStore.currentUser;
  readonly isAuthenticated = this.authStore.isAuthenticated;

  readonly userName = computed(() => this.user()?.name);
  readonly userRole = computed(() => this.user()?.userType);
  readonly isAdmin = computed(
    () => this.userRole() === 'ADMIN' || this.userRole() === 'SUPER_ADMIN',
  );

  readonly currentUrl = signal(this.router.url);
  readonly isAdminRoute = computed(() => this.currentUrl().startsWith('/admin'));

  readonly navLinks = computed<NavLink[]>(() => {
    if (this.isAdmin()) {
      return [
        { label: '仪表盘', route: '/admin', icon: 'pi pi-chart-bar' },
        { label: '预约服务', route: '/booking/services', icon: 'pi pi-calendar' },
        { label: '我的预约', route: '/my-bookings', icon: 'pi pi-list' },
        { label: '个人资料', route: '/profile', icon: 'pi pi-user' },
      ];
    }
    return [
      { label: '预约服务', route: '/booking/services', icon: 'pi pi-calendar' },
      { label: '我的预约', route: '/my-bookings', icon: 'pi pi-list' },
      { label: '个人资料', route: '/profile', icon: 'pi pi-user' },
    ];
  });

  readonly sidebarItems = computed<SidebarItem[]>(() => {
    if (this.isAdmin()) {
      return [
        { label: '仪表盘', route: '/admin', icon: 'pi pi-chart-bar' },
        { label: '预约服务', route: '/booking/services', icon: 'pi pi-calendar' },
        { label: '我的预约', route: '/my-bookings', icon: 'pi pi-list' },
        { label: '个人资料', route: '/profile', icon: 'pi pi-user' },
      ];
    }
    return [
      { label: '预约服务', route: '/booking/services', icon: 'pi pi-calendar' },
      { label: '我的预约', route: '/my-bookings', icon: 'pi pi-list' },
      { label: '个人资料', route: '/profile', icon: 'pi pi-user' },
    ];
  });

  readonly sidebarSections = computed<SidebarSection[]>(() => {
    if (this.isAdmin()) {
      return [
        {
          title: 'Main',
          items: [
            { label: '仪表盘', route: '/admin', icon: 'pi pi-chart-bar' },
            { label: '预约服务', route: '/booking/services', icon: 'pi pi-calendar' },
          ],
        },
        {
          title: 'Management',
          items: [
            { label: '我的预约', route: '/my-bookings', icon: 'pi pi-list' },
            { label: '个人资料', route: '/profile', icon: 'pi pi-user' },
          ],
        },
      ];
    }
    return [];
  });

  readonly menuItems = computed<MenuItem[]>(() => []);

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
