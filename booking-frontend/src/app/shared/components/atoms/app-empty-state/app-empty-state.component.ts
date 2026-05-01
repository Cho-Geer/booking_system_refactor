import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div class="w-20 h-20 rounded-full glass-level-1 flex items-center justify-center mb-5">
        <span class="text-3xl gradient-text" *ngIf="icon">{{ icon }}</span>
        <span class="text-3xl text-gray-400" *ngIf="!icon">📋</span>
      </div>
      <h3 class="text-lg font-bold text-gray-900 mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-500 mb-6 max-w-sm" *ngIf="description">{{ description }}</p>
      <button *ngIf="actionLabel"
              class="px-6 py-2.5 rounded-xl gradient-primary text-white font-medium text-sm
                     hover:opacity-90 transition-all duration-150 shadow-glass active:scale-[0.98]"
              (click)="action.emit()">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [':host { display: contents; }']
})
export class AppEmptyStateComponent {
  @Input() icon?: string;
  @Input() title = '暂无数据';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
