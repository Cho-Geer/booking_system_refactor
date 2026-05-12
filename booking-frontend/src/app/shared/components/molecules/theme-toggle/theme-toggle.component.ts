import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../../core/services/theme.service';


@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);

  readonly isDarkMode = this.themeService.isDarkMode;

  get tooltip(): string {
    return this.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
