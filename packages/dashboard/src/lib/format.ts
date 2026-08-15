import type { Customer, JiraStatus, Priority, Ticket } from '../types';

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
      className: 'bg-white/[0.05] text-slate-400 ring-1 ring-inset ring-white/10',
      dot: 'bg-slate-500',
    };
  }
  if (t.assignedOperatorId === null) {
    return {
      label: 'Новый',
      className: 'bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/20',
      dot: 'bg-amber-400',
    };
  }
  return {
    label: 'В работе',
    className: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20',
    dot: 'bg-emerald-400',
  };
}

// Flat, desaturated tints — restrained, "expensive", no gradients.
const avatarColors = [
  'bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-white/5',
  'bg-sky-500/15 text-sky-200 ring-1 ring-inset ring-white/5',
  'bg-indigo-500/15 text-indigo-200 ring-1 ring-inset ring-white/5',
  'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-white/5',
  'bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-white/5',
  'bg-cyan-500/15 text-cyan-200 ring-1 ring-inset ring-white/5',
  'bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-white/5',
];

export function avatarColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return avatarColors[h % avatarColors.length];
}

/** How long a ticket has waited unanswered, with an SLA colour. `now` lets the UI tick. */
export function waiting(firstWaitingAt: string | null, now: number = Date.now()) {
  if (!firstWaitingAt) return null;
  const mins = Math.max(0, Math.floor((now - new Date(firstWaitingAt).getTime()) / 60000));
  const text = mins < 60 ? `${mins}м` : `${Math.floor(mins / 60)}ч ${mins % 60}м`;
  const color = mins >= 30 ? 'text-rose-400' : mins >= 10 ? 'text-amber-400' : 'text-slate-400';
  const dot = mins >= 30 ? 'bg-rose-400' : mins >= 10 ? 'bg-amber-400' : 'bg-slate-500';
  return { mins, text, color, dot };
}

export function minutesLabel(m: number | null): string {
  if (m == null) return '—';
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return `${h} ч ${m % 60} мин`;
}

export interface PriorityMeta {
  label: string;
  dot: string;
  chip: string;
  show: boolean;
}
export function priorityMeta(p: Priority): PriorityMeta {
  switch (p) {
    case 'URGENT':
      return { label: 'Срочно', dot: 'bg-rose-500', chip: 'bg-rose-500/15 text-rose-300 ring-rose-500/25', show: true };
    case 'HIGH':
      return { label: 'Высокий', dot: 'bg-amber-500', chip: 'bg-amber-500/15 text-amber-300 ring-amber-500/25', show: true };
    case 'LOW':
      return { label: 'Низкий', dot: 'bg-slate-500', chip: 'bg-white/[0.06] text-slate-400 ring-white/10', show: true };
    default:
      return { label: 'Обычный', dot: 'bg-slate-500', chip: 'bg-white/[0.06] text-slate-400 ring-white/10', show: false };
  }
}

export const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export interface JiraStatusMeta {
  key: JiraStatus;
  label: string;
  short: string;
  dot: string;
  chip: string;
  column: string; // subtle column header accent
}

const JIRA_META: Record<JiraStatus, JiraStatusMeta> = {
  WAITING: {
    key: 'WAITING',
    label: 'Ожидает решения',
    short: 'Ожидает',
    dot: 'bg-amber-400',
    chip: 'bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/20',
    column: 'text-amber-300',
  },
  IN_PROGRESS: {
    key: 'IN_PROGRESS',
    label: 'В процессе',
    short: 'В процессе',
    dot: 'bg-sky-400',
    chip: 'bg-sky-400/10 text-sky-300 ring-1 ring-inset ring-sky-400/20',
    column: 'text-sky-300',
  },
  DONE: {
    key: 'DONE',
    label: 'Завершён',
    short: 'Завершён',
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20',
    column: 'text-emerald-300',
  },
};

export function jiraStatusMeta(s: JiraStatus): JiraStatusMeta {
  return JIRA_META[s];
}

export const JIRA_STATUSES: JiraStatus[] = ['WAITING', 'IN_PROGRESS', 'DONE'];
