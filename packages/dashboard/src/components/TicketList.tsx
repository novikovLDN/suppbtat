import type { ChatStore } from '../useChatStore';
import type { Scope } from '../types';
import { avatarColor, customerName, initials, relativeDay, statusBadge } from '../lib/format';

const SCOPES: { key: Scope; label: string; countKey?: 'unassigned' | 'mine' | 'open' }[] = [
  { key: 'all', label: 'Все', countKey: 'open' },
  { key: 'unassigned', label: 'Новые', countKey: 'unassigned' },
  { key: 'mine', label: 'Мои', countKey: 'mine' },
  { key: 'closed', label: 'Закрытые' },
];

export function TicketList({ store, className = '' }: { store: ChatStore; className?: string }) {
  return (
    <aside
      className={`panel w-full shrink-0 flex-col overflow-hidden rounded-3xl lg:w-80 xl:w-[340px] ${className}`}
    >
      {/* Search + tabs */}
      <div className="border-b border-white/40 p-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            value={store.search}
            onChange={(e) => store.setSearch(e.target.value)}
            placeholder="Поиск: #номер, имя, @username"
            className="w-full rounded-full border border-white/60 bg-white/50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-300 focus:bg-white/80 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="mt-3 flex gap-1 rounded-full bg-white/40 p-1">
          {SCOPES.map((s) => {
            const active = store.scope === s.key;
            const count = s.countKey ? store.counts[s.countKey] : undefined;
            return (
              <button
                key={s.key}
                onClick={() => store.setScope(s.key)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-white/90 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      active ? 'bg-blue-100 text-blue-600' : 'bg-white/60 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {store.loadingList && store.tickets.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">Загрузка…</div>
        )}
        {!store.loadingList && store.tickets.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            <div className="mb-2 text-3xl opacity-50">📭</div>
            Нет тикетов в этой вкладке
          </div>
        )}

        {store.tickets.map((t) => {
          const badge = statusBadge(t);
          const selected = store.selectedId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => store.selectTicket(t.id)}
              className={`group mb-1 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                selected
                  ? 'bg-blue-500/15 ring-1 ring-inset ring-blue-400/40'
                  : 'hover:bg-white/45'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-1 ring-white/50 ${avatarColor(
                  t.customer.id,
                )}`}
              >
                {initials(t.customer)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {customerName(t.customer)}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {relativeDay(t.lastMessageAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-slate-400">#{t.number}</span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">{t.subject || 'Без темы'}</span>
                  {t.unreadForOperator > 0 && (
                    <span className="accent flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white">
                      {t.unreadForOperator}
                    </span>
                  )}
                </div>
                {t.assignedOperatorName && t.status === 'OPEN' && (
                  <div className="mt-1 truncate text-[10px] text-slate-400">
                    👤 {t.assignedOperatorName}
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
