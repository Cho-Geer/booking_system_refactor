import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  readonly items = input<SidebarItem[]>([]);
  readonly isOpen = input<boolean>(false);
  readonly isAdmin = input<boolean>(false);

  readonly close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
