import { Component, input, output, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Avatar } from 'primeng/avatar';

export interface NavLink {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Menu, Avatar],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  host: { class: 'z-50' },
})
export class AppHeaderComponent {
  readonly navLinks = input<NavLink[]>([]);
  readonly userName = input<string>();
  readonly userRole = input<string>();
  readonly userAvatar = input<string>();
  readonly isAdmin = input<boolean>(false);
  readonly menuItems = input<MenuItem[]>([]);
  readonly notificationCount = input<number>(0);

  readonly menuToggle = output<void>();
  readonly logout = output<void>();

  sidebarOpen = false;

  /** Current vertical scroll position in pixels. */
  readonly scrollY = signal(0);

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrollY.set(window.scrollY);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.menuToggle.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
