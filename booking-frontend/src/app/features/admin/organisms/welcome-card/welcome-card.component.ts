import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';

@Component({
  selector: 'app-welcome-card',
  standalone: true,
  imports: [DatePipe, AppButtonComponent, RouterLink],
  templateUrl: './welcome-card.component.html',
  styleUrl: './welcome-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeCardComponent {
  readonly today = input<Date>(new Date());
}
