import { Component, input, output, signal, HostListener, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { ThemeToggleComponent } from '../../molecules/theme-toggle/theme-toggle.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';


export interface NavLink {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, Menu, ThemeToggleComponent, NgTemplateOutlet, TranslatePipe],
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
  readonly showSearch = input<boolean>(true);
  readonly extraActions = input<TemplateRef<unknown> | null>(null);

  readonly menuToggle = output<void>();
  readonly logout = output<void>();

  sidebarOpen = false;

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
