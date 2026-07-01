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
      className: 'bg-slate-400/15 text-slate-600 ring-1 ring-inset ring-white/40',
      dot: 'bg-slate-400',
    };
  }
  if (t.assignedOperatorId === null) {
    return {
      label: 'Новый',
      className: 'bg-amber-400/20 text-amber-700 ring-1 ring-inset ring-amber-300/50',
      dot: 'bg-amber-500',
    };
  }
  return {
    label: 'В работе',
    className: 'bg-emerald-400/20 text-emerald-700 ring-1 ring-inset ring-emerald-300/50',
    dot: 'bg-emerald-500',
  };
}

const avatarColors = [
  'bg-gradient-to-br from-rose-400 to-pink-500 text-white',
  'bg-gradient-to-br from-sky-400 to-blue-500 text-white',
  'bg-gradient-to-br from-violet-400 to-indigo-500 text-white',
  'bg-gradient-to-br from-emerald-400 to-teal-500 text-white',
  'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  'bg-gradient-to-br from-cyan-400 to-sky-500 text-white',
  'bg-gradient-to-br from-fuchsia-400 to-purple-500 text-white',
];

export function avatarColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return avatarColors[h % avatarColors.length];
}
