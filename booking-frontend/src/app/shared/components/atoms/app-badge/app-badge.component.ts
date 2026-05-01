import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired' | 'processing' | 'error';

export const BADGE_LABELS: Record<BadgeStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消',
  expired: '已过期',
  processing: '处理中',
  error: '异常',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
          [ngClass]="statusClass">
      {{ label }}
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
  `]
})
export class AppBadgeComponent {
  @Input() status: BadgeStatus = 'pending';
  @Input() customLabel?: string;

  get label(): string {
    return this.customLabel ?? BADGE_LABELS[this.status];
  }

  get statusClass(): string {
    const base = 'border ';
    switch (this.status) {
      case 'pending':
        return base + 'bg-gray-100 text-gray-600 border-gray-300';
      case 'confirmed':
        return base + 'bg-blue-50 text-blue-600 border-blue-200';
      case 'completed':
        return base + 'bg-green-50 text-green-600 border-green-200';
      case 'cancelled':
        return base + 'bg-red-50 text-red-600 border-red-200';
      case 'expired':
        return base + 'bg-orange-50 text-orange-600 border-orange-200';
      case 'processing':
        return base + 'bg-purple-50 text-purple-600 border-purple-200';
      case 'error':
        return base + 'bg-red-100 text-red-700 border-red-300';
      default:
        return base + 'bg-gray-100 text-gray-600 border-gray-300';
    }
  }
}
