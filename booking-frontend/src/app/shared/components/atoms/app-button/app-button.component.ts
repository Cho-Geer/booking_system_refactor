import { Component, input, output, computed } from '@angular/core';
import { Button } from 'primeng/button';
import { ButtonSeverity } from 'primeng/types/button';

export type ButtonIconPosition = 'left' | 'right' | 'top' | 'bottom';
export type AppButtonSize = 'sm' | 'md' | 'lg';
export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

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
  readonly size = input<AppButtonSize>('md');

  /** Defines the visual variant of the button. */
  readonly variant = input<AppButtonVariant>('primary');

  /** Whether to display in icon-only mode. */
  readonly iconOnly = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

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

  /** Resolved icon: shows spinner when loading. */
  readonly resolvedIcon = computed(() => {
    if (this.loading()) {
      return 'pi pi-spinner pi-spin';
    }
    return this.icon();
  });

  /** Resolved disabled state: also disabled when loading. */
  readonly isDisabled = computed(() => {
    return this.disabled() || this.loading();
  });

  /** Mapped PrimeNG size from our size enum. */
  readonly primeSize = computed(() => {
    const s = this.size();
    if (s === 'sm') return 'small';
    if (s === 'lg') return 'large';
    return undefined;
  });

  /** Computed style class with click feedback and variant/size classes. */
  get combinedStyleClass(): string {
    const base = this.styleClass() || '';
    const classes = [
      'app-button-click-feedback',
      `app-button--${this.variant()}`,
      `app-button--${this.size()}`,
    ];

    if (this.iconOnly()) {
      classes.push('app-button--icon-only');
    }

    return base ? `${base} ${classes.join(' ')}` : classes.join(' ');
  }
}
