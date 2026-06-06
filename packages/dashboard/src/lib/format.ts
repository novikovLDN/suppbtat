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
      className: 'bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-400/20',
      dot: 'bg-slate-400',
    };
  }
  if (t.assignedOperatorId === null) {
    return {
      label: 'Новый',
      className: 'bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/25',
      dot: 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.5)]',
    };
  }
  return {
    label: 'В работе',
    className: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/25',
    dot: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]',
  };
}

const avatarColors = [
  'bg-gradient-to-br from-rose-500/40 to-orange-500/20 text-rose-100',
  'bg-gradient-to-br from-sky-500/40 to-cyan-500/20 text-sky-100',
  'bg-gradient-to-br from-violet-500/40 to-indigo-500/20 text-violet-100',
  'bg-gradient-to-br from-emerald-500/40 to-teal-500/20 text-emerald-100',
  'bg-gradient-to-br from-amber-500/40 to-yellow-500/20 text-amber-100',
  'bg-gradient-to-br from-cyan-500/40 to-blue-500/20 text-cyan-100',
  'bg-gradient-to-br from-fuchsia-500/40 to-pink-500/20 text-fuchsia-100',
];

export function avatarColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return avatarColors[h % avatarColors.length];
}
