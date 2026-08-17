import { useState, type ReactNode } from 'react';
import { Search, User, Inbox, Clock, ArrowDownUp, PlusCircle, Tag, Headphones } from 'lucide-react';
import type { ChatStore } from '../useChatStore';
import type { Scope } from '../types';
import { getPersona } from '../lib/personas';
import {
  avatarColor,
  customerName,
  initials,
  priorityMeta,
  relativeDay,
  statusBadge,
  waiting,
} from '../lib/format';

const SCOPES: { key: Scope; label: string; countKey?: 'unassigned' | 'mine' | 'open' }[] = [
  { key: 'all', label: 'Все', countKey: 'open' },
  { key: 'unassigned', label: 'Новые', countKey: 'unassigned' },
  { key: 'mine', label: 'Мои', countKey: 'mine' },
  { key: 'closed', label: 'Закрытые' },
];

export function TicketList({ store, className = '' }: { store: ChatStore; className?: string }) {
  const [claiming, setClaiming] = useState(false);

  const claimNext = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await store.claimNext(getPersona() || undefined);
    } catch {
      /* queue empty — ignore */
    } finally {
      setClaiming(false);
    }
  };

  return (
    <aside
      className={`panel w-full shrink-0 flex-col overflow-hidden rounded-[26px] lg:w-80 xl:w-[340px] ${className}`}
    >
      <div className="border-b border-white/[0.06] p-3">
        {/* Live operational KPIs — glanceable queue state */}
        <div className="tile mb-3 grid grid-cols-3 divide-x divide-white/[0.06] overflow-hidden rounded-2xl">
          <Kpi
            icon={<Clock size={12} />}
            label="Ждут"
            value={store.counts.waiting}
            tone={store.counts.waiting > 0 ? 'warn' : 'muted'}
          />
          <Kpi
            icon={<Headphones size={12} />}
            label="В работе"
            value={store.counts.inWork}
            tone="ok"
          />
          <Kpi
            icon={<Inbox size={12} />}
            label="Новые"
            value={store.counts.unassigned}
            tone={store.counts.unassigned > 0 ? 'accent' : 'muted'}
          />
        </div>

        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={store.search}
            onChange={(e) => store.setSearch(e.target.value)}
            placeholder="Поиск: #, имя, текст сообщения"
            className="tile w-full rounded-full py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div className="mt-3 flex gap-1 rounded-full bg-white/[0.03] p-1">
          {SCOPES.map((s) => {
            const active = store.scope === s.key;
            const count = s.countKey ? store.counts[s.countKey] : undefined;
            return (
              <button
                key={s.key}
                onClick={() => store.setScope(s.key)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-1.5 text-[11px] font-semibold transition ${
                  active ? 'bg-[var(--pill-bg)] text-[var(--pill-fg)]' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {s.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      active ? 'bg-[var(--pill-badge-bg)] text-[var(--pill-badge-fg)]' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => store.setSort(store.sort === 'waiting' ? 'recent' : 'waiting')}
            className="tile tile-hover flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition"
            title="Сортировка"
          >
            {store.sort === 'waiting' ? <Clock size={13} /> : <ArrowDownUp size={13} />}
            {store.sort === 'waiting' ? 'Дольше ждут' : 'Недавние'}
          </button>
          <button
            onClick={claimNext}
            disabled={claiming || store.counts.unassigned === 0}
            className="accent flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white transition active:scale-95 disabled:opacity-40"
            title="Взять самый давний неотвеченный тикет"
          >
            <PlusCircle size={13} /> Взять следующий
          </button>
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {store.loadingList &&
          store.tickets.length === 0 &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-1 flex items-start gap-3 px-3 py-3">
              <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 py-1">
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-2.5 w-1/3 rounded" />
                <div className="skeleton h-2.5 w-3/4 rounded" />
              </div>
            </div>
          ))}
        {!store.loadingList && store.tickets.length === 0 && (
          <div className="flex flex-col items-center p-10 text-center text-sm text-slate-500">
            <Inbox size={32} strokeWidth={1.25} className="mb-2 opacity-40" />
            Нет тикетов в этой вкладке
          </div>
        )}

        {store.tickets.map((t) => {
          const badge = statusBadge(t);
          const selected = store.selectedId === t.id;
          const pr = priorityMeta(t.priority);
          const w = t.status === 'OPEN' ? waiting(t.firstWaitingAt, store.now) : null;
          return (
            <button
              key={t.id}
              onClick={() => store.selectTicket(t.id)}
              className={`group relative mb-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 ${
                selected
                  ? 'bg-white/[0.07] ring-1 ring-inset ring-white/10'
                  : 'hover:bg-white/[0.04] active:scale-[0.99]'
              }`}
            >
              {selected && (
                <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-indigo-400" />
              )}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                  t.customer.id,
                )}`}
              >
                {initials(t.customer)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {pr.show && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pr.dot}`} title={pr.label} />}
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {customerName(t.customer)}
                    </span>
                  </span>
                  {w ? (
                    <span className={`flex shrink-0 items-center gap-1 text-[11px] font-medium ${w.color}`}>
                      <Clock size={11} /> {w.text}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-500">{relativeDay(t.lastMessageAt)}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-slate-500">#{t.number}</span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-400">{t.subject || 'Без темы'}</span>
                  {t.unreadForOperator > 0 && (
                    <span className="accent flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white">
                      {t.unreadForOperator}
                    </span>
                  )}
                </div>
                {t.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-400"
                      >
                        <Tag size={8} /> {tag}
                      </span>
                    ))}
                  </div>
                )}
                {t.assignedOperatorName && t.status === 'OPEN' && (
                  <div className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500">
                    <User size={10} /> {t.assignedOperatorName}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'warn' | 'ok' | 'accent' | 'muted';
}) {
  const color = {
    warn: 'text-amber-300',
    ok: 'text-emerald-300',
    accent: 'text-indigo-300',
    muted: 'text-slate-500',
  }[tone];
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-1 py-2.5">
      <span
        className={`text-[19px] font-semibold leading-none tracking-tight tabular-nums ${
          value > 0 ? 'text-slate-100' : 'text-slate-600'
        }`}
      >
        {value}
      </span>
      <span className={`label flex items-center gap-1 text-[9px] ${value > 0 ? color : 'text-slate-600'}`}>
        {icon}
        {label}
      </span>
    </div>
  );
}
