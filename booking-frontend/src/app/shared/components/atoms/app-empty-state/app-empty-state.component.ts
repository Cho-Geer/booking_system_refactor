import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div class="w-20 h-20 rounded-full sharp-card flex items-center justify-center mb-5">
        <span class="text-3xl gradient-text" *ngIf="icon">{{ icon }}</span>
        <span class="text-3xl text-gray-400" *ngIf="!icon">📋</span>
      </div>
      <h3 class="text-lg font-bold text-text-primary mb-2">{{ title || ('global.noData' | t) }}</h3>
      <p class="text-sm text-text-secondary mb-6 max-w-sm" *ngIf="description">{{ description }}</p>
      <button *ngIf="actionLabel"
              class="px-6 py-2.5 rounded-lg bg-accent-green hover:bg-accent-green-dark text-white font-medium text-sm transition-colors active:scale-[0.98]"
              (click)="action.emit()">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [':host { display: contents; }']
})
export class AppEmptyStateComponent {
  @Input() icon?: string;
  @Input() title = '';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
