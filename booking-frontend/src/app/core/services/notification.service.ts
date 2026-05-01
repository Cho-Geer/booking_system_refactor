import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  content?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  private show(type: Toast['type'], title: string, content?: string, duration = 3000): void {
    const toast: Toast = { id: `toast-${++this.counter}`, type, title, content, duration };
    this.toasts.update(list => [...list, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }
  }

  success(title: string, content?: string): void { this.show('success', title, content); }
  warning(title: string, content?: string): void { this.show('warning', title, content); }
  error(title: string, content?: string): void { this.show('error', title, content); }
  info(title: string, content?: string): void { this.show('info', title, content); }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clear(): void { this.toasts.set([]); }
}
