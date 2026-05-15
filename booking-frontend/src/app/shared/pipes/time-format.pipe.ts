import { Pipe, PipeTransform } from '@angular/core';

/**
 * Standalone pipe for formatting time strings.
 *
 * Usage in templates:
 * ```
 * {{ '09:00' | timeFormat }}
 * {{ slot.time | timeFormat }}
 * ```
 *
 * The pipe expects a time string in HH:mm format (24-hour) and returns
 * a formatted version. Currently acts as an identity/pass-through pipe
 * that validates the HH:mm format. Invalid inputs are returned unchanged.
 */
@Pipe({
  name: 'timeFormat',
  standalone: true,
  pure: true,
})
export class TimeFormatPipe implements PipeTransform {
  /**
   * Validates and formats a time string.
   *
   * @param value  A time string, expected in `HH:mm` format.
   * @returns The formatted time string, or the original value if invalid.
   */
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Validate HH:mm format
    const timeRegex = /^(\d{2}):(\d{2})$/;
    const match = value.match(timeRegex);

    if (!match) {
      return value; // Return unchanged for invalid format
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    // Validate hours (0-23) and minutes (0-59)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return value; // Return unchanged for out-of-range values
    }

    // Return formatted as HH:mm (ensuring consistent formatting)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
