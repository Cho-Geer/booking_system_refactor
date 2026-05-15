import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

/**
 * Standalone pipe for translating i18n keys with optional parameter interpolation.
 *
 * Usage in templates:
 * ```
 * {{ 'global.save' | t }}
 * {{ 'booking.greeting' | t : { name: 'Alice' } }}
 * ```
 *
 * The value must be in `'domain.key'` format. The pipe splits at the first `.`
 * to extract the domain and key, then delegates to `TranslationService.t()`.
 */
@Pipe({
  name: 't',
  standalone: true,
  pure: true,
})
export class TranslatePipe implements PipeTransform {
  private translationService = inject(TranslationService);

  /**
   * Translates the given key to the current locale.
   *
   * @param value  A string in `'domain.key'` format.
   * @param params Optional map of interpolation parameters for `{param}` placeholders.
   * @returns The translated string, or `{{domain.key}}` fallback if not found.
   */
  transform(
    value: string,
    params?: Record<string, string | number>,
  ): string {
    const dotIndex = value.indexOf('.');
    const domain = value.substring(0, dotIndex);
    const key = value.substring(dotIndex + 1);

    return this.translationService.t(domain, key, params);
  }
}
