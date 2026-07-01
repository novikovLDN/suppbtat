import type { Customer, Ticket } from '../types';

export function customerName(c: Customer): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (c.username) return `@${c.username}`;
  return `ID ${c.id}`;
}

export function initials(c: Customer): string {
  const name = customerName(c).replace('@', '');
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  if (isToday) return timeShort(iso);
  if (isYest) return 'вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export interface StatusBadge {
  label: string;
  className: string;
  dot: string;
}

/** The three operational states the dashboard must show clearly. */
export function statusBadge(t: Ticket): StatusBadge {
  if (t.status === 'CLOSED') {
    return {
      label: 'Закрыт',
      className: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
      dot: 'bg-slate-400',
    };
  }
  if (t.assignedOperatorId === null) {
    return {
      label: 'Новый',
      className: 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200',
      dot: 'bg-amber-500',
    };
  }
  return {
    label: 'В работе',
    className: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200',
    dot: 'bg-emerald-500',
  };
}

const avatarColors = [
  'bg-rose-100 text-rose-600',
  'bg-sky-100 text-sky-600',
  'bg-violet-100 text-violet-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-cyan-100 text-cyan-600',
  'bg-fuchsia-100 text-fuchsia-600',
];

export function avatarColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return avatarColors[h % avatarColors.length];
}
