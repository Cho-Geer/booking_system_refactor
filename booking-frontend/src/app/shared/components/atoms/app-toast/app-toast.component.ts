import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'success' | 'warning' | 'error' | 'info';
export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  content: string;
  duration?: number;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-3">
      <div *ngFor="let msg of messages"
           class="sharp-card px-5 py-4 min-w-[320px] max-w-md flex items-start gap-3 cursor-pointer animate-fade-in"
           [ngClass]="{'border-l-4': true}"
           [class.border-green-500]="msg.type === 'success'"
           [class.border-yellow-500]="msg.type === 'warning'"
           [class.border-red-500]="msg.type === 'error'"
           [class.border-blue-500]="msg.type === 'info'"
           (click)="dismiss(msg.id)">
        <span class="text-lg flex-shrink-0">
          <ng-container [ngSwitch]="msg.type">
            <span *ngSwitchCase="'success'">✓</span>
            <span *ngSwitchCase="'warning'">⚠</span>
            <span *ngSwitchCase="'error'">✕</span>
            <span *ngSwitchCase="'info'">ℹ</span>
          </ng-container>
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">{{ msg.title }}</p>
          <p class="text-xs text-gray-500 mt-0.5" *ngIf="msg.content">{{ msg.content }}</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600 flex-shrink-0">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    /* Toast slide-in animation */
    .animate-toast-slide-in {
      animation: var(--animate-toast-slide-in, toastSlideIn 300ms ease-out);
    }

    /* Toast dismiss slide-out animation */
    .animate-toast-slide-out {
      animation: var(--animate-toast-slide-out, toastSlideOut 200ms ease-in forwards);
    }
  `]
})
export class AppToastComponent {
  @Input() messages: ToastMessage[] = [];

  dismiss(id: string): void {
    this.messages = this.messages.filter(m => m.id !== id);
  }
}
