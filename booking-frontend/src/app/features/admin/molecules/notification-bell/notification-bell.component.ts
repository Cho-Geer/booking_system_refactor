import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { NotificationItem } from '../../dto/admin.dto';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly unreadCount = signal(0);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly dropdownOpen = signal(false);

  ngOnInit(): void {
    this.loadUnreadCount();
    this.loadNotifications();
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  markAsRead(id: string): void {
    this.adminService.markNotificationRead(id).subscribe({
      next: () => {
        this.loadUnreadCount();
        this.loadNotifications();
      },
    });
  }

  getTypeIcon(type: NotificationItem['type']): string {
    switch (type) {
      case 'info': return 'pi pi-info-circle text-accent-blue';
      case 'warning': return 'pi pi-exclamation-triangle text-accent-yellow';
      case 'error': return 'pi pi-times-circle text-accent-red';
      case 'success': return 'pi pi-check-circle text-accent-green';
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  private loadUnreadCount(): void {
    this.adminService.getUnreadCount().subscribe({
      next: result => this.unreadCount.set(result.count),
    });
  }

  private loadNotifications(): void {
    this.adminService.getNotifications(1, 5).subscribe({
      next: result => this.notifications.set(result.items),
    });
  }
}
