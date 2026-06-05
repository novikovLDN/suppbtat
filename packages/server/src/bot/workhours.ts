import { config } from '../config.js';

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Is support currently within working hours? Uses the configured IANA timezone
 * so it's correct regardless of where the server runs (e.g. Railway = UTC).
 * Supports overnight windows (e.g. 22:00–06:00).
 */
export function isWithinWorkingHours(now = new Date()): boolean {
  if (!config.workHours.enabled) return true;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.workHours.tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const cur = hour * 60 + minute;

  const start = minutesOfDay(config.workHours.start);
  const end = minutesOfDay(config.workHours.end);

  if (start === end) return true; // 24/7
  if (start < end) return cur >= start && cur < end;
  // overnight window
  return cur >= start || cur < end;
}
