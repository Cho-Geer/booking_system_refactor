import { Component, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppHeaderComponent, NavLink } from '../app-header/app-header.component';
import { AppSidebarComponent, SidebarItem } from '../app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent {
  readonly navLinks = input<NavLink[]>([
    { label: '预约服务', route: '/booking/services', icon: '📅' },
    { label: '我的预约', route: '/my-bookings', icon: '📋' },
    { label: '个人资料', route: '/profile', icon: '👤' },
  ]);

  readonly sidebarItems = input<SidebarItem[]>([
    { label: '预约服务', route: '/booking/services', icon: '📅' },
    { label: '我的预约', route: '/my-bookings', icon: '📋' },
    { label: '个人资料', route: '/profile', icon: '👤' },
  ]);

  readonly menuItems = input<MenuItem[]>([]);
  readonly userName = input<string>();
  readonly userRole = input<string>();
  readonly isAdmin = input<boolean>(false);

  sidebarOpen = false;

  onMenuToggle(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  onLogout(): void {
    // Will be wired to auth store in integration phase
    console.log('Logout requested');
  }
}
