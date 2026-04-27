import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';

export type InputVariant = 'filled' | 'outlined';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [FormsModule, InputText],
  templateUrl: './app-input.component.html',
  styleUrl: './app-input.component.scss',
})
export class AppInputComponent {
  /** The value of the input. */
  readonly value = input<string>('');

  /** Placeholder text. */
  readonly placeholder = input<string>('');

  /** Whether the input is disabled. */
  readonly disabled = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the input is readonly. */
  readonly readonly = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the input is in invalid state. */
  readonly invalid = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Specifies the variant of the component. */
  readonly variant = input<InputVariant>('outlined');

  /** Spans 100% width of the container when enabled. */
  readonly fluid = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Type of the input element. */
  readonly type = input<string>('text');

  /** Class of the element. */
  readonly styleClass = input<string>('');

  /** Aria label for accessibility. */
  readonly ariaLabel = input<string>('');

  /** Emitted when the input value changes. */
  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
