import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export interface ServicePopularityItem {
  name: string;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-service-popularity-panel',
  standalone: true,
  imports: [],
  template: `
    <div class="sharp-card p-5 bg-card-bg">
      <h3 class="text-base font-bold text-text-primary mb-5">Service Popularity</h3>
      <div class="space-y-4">
        @for (svc of services(); track svc.name) {
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-text-primary">{{ svc.name }}</span>
              <span class="text-xs text-text-secondary">{{ svc.percentage }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" [style.width.%]="svc.percentage"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicePopularityPanelComponent {
  readonly services = input.required<ServicePopularityItem[]>();
}
