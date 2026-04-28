import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

export type DropdownVariant = 'filled' | 'outlined';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [FormsModule, Select],
  templateUrl: './app-dropdown.component.html',
  styleUrl: './app-dropdown.component.scss',
})
export class AppDropdownComponent {
  /** An array of selectable items. */
  readonly options = input<unknown[]>([]);

  /** Name of the label field of an option. */
  readonly optionLabel = input<string>();

  /** Name of the value field of an option. */
  readonly optionValue = input<string>();

  /** Placeholder text. */
  readonly placeholder = input<string>();

  /** When present, it specifies that the component should be disabled. */
  readonly disabled = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the dropdown is in invalid state. */
  readonly invalid = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Specifies the variant of the component. */
  readonly variant = input<DropdownVariant>('outlined');

  /** When specified, displays a filter input. */
  readonly filter = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Class of the element. */
  readonly styleClass = input<string>();

  /** Emitted when the selected value changes. */
  readonly valueChange = output<unknown>();

  onModelChange(value: unknown): void {
    this.valueChange.emit(value);
  }
}
