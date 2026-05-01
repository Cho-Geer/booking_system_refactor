import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button"
            role="switch"
            [attr.aria-checked]="checked"
            [disabled]="disabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-primary-start/30 focus:ring-offset-2"
            [ngClass]="checked ? 'gradient-primary' : 'bg-gray-200'"
            (click)="toggle()">
      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm"
            [ngClass]="checked ? 'translate-x-6' : 'translate-x-1'">
      </span>
    </button>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppToggleComponent),
      multi: true,
    },
  ],
})
export class AppToggleComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  checked = false;
  private onChange: (val: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.checkedChange.emit(this.checked);
  }

  writeValue(val: boolean): void { this.checked = val ?? false; }
  registerOnChange(fn: (val: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
}
