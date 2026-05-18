import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired' | 'processing' | 'error';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeShape = 'rounded' | 'pill';

export const BADGE_LABELS: Record<BadgeStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  processing: 'Processing',
  error: 'Error',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-badge.component.html',
  styleUrl: './app-badge.component.scss',
})
export class AppBadgeComponent {
  /** Status of the badge determining its color. */
  readonly status = input<BadgeStatus>('pending');

  /** Custom label text. If not provided, uses status default label. */
  readonly customLabel = input<string>();

  /** Size of the badge. */
  readonly size = input<BadgeSize>('md');

  /** Shape of the badge. */
  readonly shape = input<BadgeShape>('rounded');

  /** Resolved label text. */
  get label(): string {
    return this.customLabel() ?? BADGE_LABELS[this.status()];
  }

  get statusClass(): string {
    const classes: string[] = [
      'app-badge',
      `app-badge--${this.status()}`,
      `app-badge--${this.size()}`,
      `app-badge--${this.shape()}`,
    ];

    return classes.join(' ');
  }
}
