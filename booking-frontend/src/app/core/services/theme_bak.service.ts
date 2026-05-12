import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

const STORAGE_KEY = 'booking-theme';
const DARK_VALUE = 'dark';
const LIGHT_VALUE = 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the current theme is dark mode. Dark-first default. */
  readonly isDarkMode = signal<boolean>(true);

  constructor() {
    // 1. Initialize from localStorage or system preference
    this.initializeTheme();

    // 2. Listen for system preference changes
    this.watchSystemPreference();
  }

  /** Toggle between dark and light mode. */
  toggle(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    this.applyTheme(next);
    this.persistPreference(next);
  }

  /** Enable dark mode. */
  enable(): void {
    if (!this.isDarkMode()) {
      this.isDarkMode.set(true);
      this.applyTheme(true);
      this.persistPreference(true);
    }
  }

  /** Disable dark mode (switch to light). */
  disable(): void {
    if (this.isDarkMode()) {
      this.isDarkMode.set(false);
      this.applyTheme(false);
      this.persistPreference(false);
    }
  }

  private initializeTheme(): void {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK_VALUE) {
      this.isDarkMode.set(true);
      this.applyTheme(true);
      return;
    }
    if (stored === LIGHT_VALUE) {
      this.isDarkMode.set(false);
      this.applyTheme(false);
      return;
    }
    // Fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDarkMode.set(prefersDark);
    this.applyTheme(prefersDark);
  }

  private watchSystemPreference(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    fromEvent<MediaQueryListEvent>(mediaQuery, 'change')
      .pipe(
        map(e => e.matches),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(isDark => {
        // Only auto-update if user hasn't explicitly set a preference
        if (!localStorage.getItem(STORAGE_KEY)) {
          this.isDarkMode.set(isDark);
          this.applyTheme(isDark);
        }
      });
  }

  private applyTheme(isDark: boolean): void {
    const html = document.documentElement;

    // Add smooth transition
    html.style.transition = 'background-color 0.3s ease, color 0.3s ease';

    if (isDark) {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
    }
  }

  private persistPreference(isDark: boolean): void {
    localStorage.setItem(STORAGE_KEY, isDark ? DARK_VALUE : LIGHT_VALUE);
  }
}
