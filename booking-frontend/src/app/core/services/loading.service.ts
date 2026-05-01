import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly isLoading = signal(false);
  private counter = 0;

  show(): void {
    this.counter++;
    this.isLoading.set(true);
  }

  hide(): void {
    this.counter = Math.max(0, this.counter - 1);
    if (this.counter === 0) this.isLoading.set(false);
  }

  reset(): void {
    this.counter = 0;
    this.isLoading.set(false);
  }
}
