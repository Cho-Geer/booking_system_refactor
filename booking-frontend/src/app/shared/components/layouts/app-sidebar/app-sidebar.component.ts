import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Avatar } from 'primeng/avatar';

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
  imports: [RouterLink, RouterLinkActive, NgClass, Avatar],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  readonly items = input<SidebarItem[]>([]);
  readonly sections = input<SidebarSection[]>([]);
  readonly isOpen = input<boolean>(false);
  readonly isAdmin = input<boolean>(false);

  /** Solid mode — uses white background without blur for admin panels. */
  readonly solid = input<boolean>(true);

  readonly userName = input<string>();
  readonly userRole = input<string>();
  readonly userAvatar = input<string>();

  readonly close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
