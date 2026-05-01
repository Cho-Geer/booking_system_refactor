import { Component, input } from '@angular/core';
import { Card } from 'primeng/card';

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

  /** Computed style class with hover effect added. */
  get combinedStyleClass(): string {
    const base = this.styleClass() || '';
    const hoverClass = 'app-card-hover';
    return base ? `${base} ${hoverClass}` : hoverClass;
  }
}
