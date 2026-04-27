import { Component, input } from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [ProgressSpinner],
  templateUrl: './app-spinner.component.html',
  styleUrl: './app-spinner.component.scss',
})
export class AppSpinnerComponent {
  /** Width of the circle stroke. */
  readonly strokeWidth = input<string>('4');

  /** Color for the background of the circle. */
  readonly fill = input<string>('transparent');

  /** Duration of the rotation animation. */
  readonly animationDuration = input<string>('2s');

  /** Aria label for accessibility. */
  readonly ariaLabel = input<string>('loading');

  /** Class of the element. */
  readonly styleClass = input<string>();
}
