import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  templateUrl: './app-filter-bar.component.html',
  styleUrl: './app-filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFilterBarComponent {}
