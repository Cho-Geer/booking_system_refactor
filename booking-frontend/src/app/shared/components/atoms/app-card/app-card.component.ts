import { Component, input } from '@angular/core';
import { Card } from 'primeng/card';

export type AppCardVariant = 'sharp' | 'bordered' | 'flat';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [Card],
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.scss',
})
export class AppCardComponent {
  readonly header = input<string>();

  readonly subheader = input<string>();

  readonly styleClass = input<string>();

  readonly variant = input<AppCardVariant>('sharp');

  readonly headerIcon = input<string>();

  get combinedStyleClass(): string {
    const base = this.styleClass() || '';
    const variant = this.variant();
    const classes = ['app-card-hover', `app-card--${variant}`];

    if (variant === 'sharp') {
      classes.push('sharp-card');
    }

    if (variant === 'bordered') {
      classes.push('border', 'border-solid', 'rounded-lg');
    }

    if (variant === 'flat') {
      classes.push('shadow-none', 'rounded-lg');
    }

    return base ? `${base} ${classes.join(' ')}` : classes.join(' ');
  }
}
