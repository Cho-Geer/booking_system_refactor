import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavLink } from '../app-header/app-header.component';

export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  readonly items = input<SidebarItem[]>([]);
  readonly sections = input<SidebarSection[]>([]);
  readonly navLinks = input<NavLink[]>([]);
  readonly isOpen = input<boolean>(false);
  readonly userName = input<string>();
  readonly userRole = input<string>();
  readonly userAvatar = input<string>();
  readonly solid = input<boolean>(false);
  readonly close = output<void>();
  readonly logout = output<void>();

  onClose(): void {
    this.close.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
