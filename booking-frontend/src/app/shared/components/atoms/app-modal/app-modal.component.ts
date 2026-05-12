import { Component, input, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';

export type DialogPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topleft'
  | 'topright'
  | 'bottomleft'
  | 'bottomright';

export type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [Dialog],
  templateUrl: './app-modal.component.html',
  styleUrl: './app-modal.component.scss',
})
export class AppModalComponent {
  /** Whether the dialog is visible. */
  readonly visible = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Title text of the dialog. */
  readonly header = input<string>();

  /** Whether to show a close icon. */
  readonly closable = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether clicking outside closes the dialog. */
  readonly dismissableMask = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the dialog is draggable. */
  readonly draggable = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether the dialog is resizable. */
  readonly resizable = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Whether to display a modal overlay. */
  readonly modal = input<boolean, boolean | undefined>(undefined, {
    transform: (v: boolean | undefined) => v ?? false,
  });

  /** Position of the dialog. */
  readonly position = input<DialogPosition>('center');

  /** Class of the element. */
  readonly styleClass = input<string>();

  /** Target element to attach the dialog. */
  readonly appendTo = input<string>();

  /** Size of the modal. */
  readonly size = input<ModalSize>('md');

  /** Emitted when the dialog visibility changes. */
  readonly visibleChange = output<boolean>();

  get combinedStyleClass(): string {
    const base = this.styleClass() || '';
    const sizeClass = this.getSizeClass();
    return [base, 'sharp-card', sizeClass].filter(Boolean).join(' ');
  }

  /** Get style class for modal size. */
  private getSizeClass(): string {
    switch (this.size()) {
      case 'sm':
        return 'app-modal--sm';
      case 'md':
        return 'app-modal--md';
      case 'lg':
        return 'app-modal--lg';
      case 'fullscreen':
        return 'app-modal--fullscreen';
      default:
        return '';
    }
  }
}
