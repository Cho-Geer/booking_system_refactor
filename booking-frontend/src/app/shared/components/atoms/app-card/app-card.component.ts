import { Component, input } from '@angular/core';
import { Card } from 'primeng/card';

export type AppCardVariant = 'default' | 'glass' | 'elevated' | 'outlined';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [Card],
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.scss',
})
export class AppCardComponent {
  /** Title of the card. */
  readonly header = input<string>();

  /** Secondary title of the card. */
  readonly subheader = input<string>();

  /** Class of the element. */
  readonly styleClass = input<string>();

  /** Variant of the card. */
  readonly variant = input<AppCardVariant>('default');

  /** Name of the PrimeIcon to display in the header. */
  readonly headerIcon = input<string>();

  /** Whether to show the top accent gradient bar. */
  readonly accentBar = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Glass mode — applies glassmorphism styling with gradient accent bar.
   * @deprecated Use `variant="glass"` instead.
   */
  readonly glass = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the accent bar should be visible. */
  get showAccentBar(): boolean {
    return this.accentBar() || this.glass() || this.variant() === 'glass';
  }

  /** Resolved variant: legacy glass input maps to glass variant. */
  get resolvedVariant(): AppCardVariant {
    if (this.glass()) {
      return 'glass';
    }
    return this.variant();
  }

  /** Computed style class with hover and variant-specific effects. */
  get combinedStyleClass(): string {
    const base = this.styleClass() || '';
    const variant = this.resolvedVariant;
    const classes = ['app-card-hover', `app-card--${variant}`];

    if (variant === 'glass') {
      classes.push('glass-level-1', 'shadow-glass');
    }

    if (variant === 'elevated') {
      classes.push('shadow-xl', 'hover-lift');
    }

    if (variant === 'outlined') {
      classes.push('border', 'border-solid');
    }

    if (variant === 'default') {
      classes.push('shadow-md');
    }

    return base ? `${base} ${classes.join(' ')}` : classes.join(' ');
  }
}
