import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

export interface StatCardData {
  label: string;
  value: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  trend: string;
  trendUp: boolean;
  progress: number;
  target: number;
  color: string;
}

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  readonly data = input.required<StatCardData>();
}
