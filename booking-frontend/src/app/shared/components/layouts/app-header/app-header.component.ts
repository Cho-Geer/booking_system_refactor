import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
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
  imports: [RouterLink, RouterLinkActive, NgClass, Menu, Avatar],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  readonly navLinks = input<NavLink[]>([]);
  readonly userName = input<string>();
  readonly userRole = input<string>();
  readonly userAvatar = input<string>();
  readonly isAdmin = input<boolean>(false);
  readonly menuItems = input<MenuItem[]>([]);

  readonly menuToggle = output<void>();
  readonly logout = output<void>();

  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.menuToggle.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
