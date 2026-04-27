import { Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { ButtonSeverity } from 'primeng/types/button';

export type ButtonIconPosition = 'left' | 'right' | 'top' | 'bottom';
export type ButtonSize = 'small' | 'large';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [Button],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.scss',
})
export class AppButtonComponent {
  /** Text of the button. */
  readonly label = input<string>();

  /** Defines the style of the button. */
  readonly severity = input<ButtonSeverity>();

  /** When present, it specifies that the component should be disabled. */
  readonly disabled = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the button is in loading state. */
  readonly loading = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Name of the icon. */
  readonly icon = input<string>();

  /** Position of the icon. */
  readonly iconPos = input<ButtonIconPosition>('left');

  /** Type of the button. */
  readonly type = input<string>('button');

  /** Defines the size of the button. */
  readonly size = input<ButtonSize>();

  /** Add a shadow to indicate elevation. */
  readonly raised = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Add a circular border radius to the button. */
  readonly rounded = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Add a textual class to the button without a background initially. */
  readonly text = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Add a border class without a background initially. */
  readonly outlined = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Add a link style to the button. */
  readonly link = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Add a plain textual class to the button. */
  readonly plain = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Class of the element. */
  readonly styleClass = input<string>();

  /** Callback to execute when button is clicked. */
  readonly onClick = output<MouseEvent>();
}
