import { Injectable, signal } from '@angular/core';

export interface ModalOptions {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger';
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly isOpen = signal(false);
  readonly options = signal<ModalOptions | null>(null);

  open(opts: ModalOptions): void {
    this.options.set(opts);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.options.set(null);
  }

  confirm(): void {
    this.options()?.onConfirm?.();
    this.close();
  }

  cancel(): void {
    this.options()?.onCancel?.();
    this.close();
  }
}
