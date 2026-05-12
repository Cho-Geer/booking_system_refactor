import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-table-wrapper',
  standalone: true,
  templateUrl: './app-table-wrapper.component.html',
  styleUrl: './app-table-wrapper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTableWrapperComponent {}
