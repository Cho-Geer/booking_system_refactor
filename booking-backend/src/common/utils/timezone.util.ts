export function formatTimestampWithTimezone(timezone?: string): string {
  if (!timezone) return new Date().toISOString();
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    const now = new Date();
    const tzStr = now.toLocaleString('sv-SE', { timeZone: timezone });
    const [datePart, timePart] = tzStr.split(' ');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min, s] = timePart.split(':').map(Number);
    const tzDate = Date.UTC(y, m - 1, d, h, min, s);
    const diffMs = tzDate - now.getTime();
    const offsetMin = Math.round(diffMs / 60000);
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const hours = String(Math.floor(abs / 60)).padStart(2, '0');
    const minutes = String(abs % 60).padStart(2, '0');
    return now.toISOString().replace('Z', `${sign}${hours}:${minutes}`);
  } catch {
    return new Date().toISOString();
  }
}
