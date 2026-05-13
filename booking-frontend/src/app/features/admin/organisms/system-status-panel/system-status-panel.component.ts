import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { SystemHealthDetail } from '../../dto/admin.dto';

export interface SystemStatusItem {
  label: string;
  status: string;
  color: string;
}

@Component({
  selector: 'app-system-status-panel',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './system-status-panel.component.html',
  styleUrl: './system-status-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemStatusPanelComponent {
  readonly statusItems = input.required<SystemStatusItem[]>();
  readonly metrics = input<SystemHealthDetail | null>(null);
  readonly expandChange = output<void>();
  readonly expanded = signal(false);

  toggleExpand(): void {
    this.expanded.set(!this.expanded());
    if (this.expanded()) {
      this.expandChange.emit();
    }
  }
}
