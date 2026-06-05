import type { ChatStore } from '../useChatStore';
import type { Scope } from '../types';
import { avatarColor, customerName, initials, relativeDay, statusBadge } from '../lib/format';

const SCOPES: { key: Scope; label: string; countKey?: 'unassigned' | 'mine' | 'open' }[] = [
  { key: 'all', label: 'Все', countKey: 'open' },
  { key: 'unassigned', label: 'Новые', countKey: 'unassigned' },
  { key: 'mine', label: 'Мои', countKey: 'mine' },
  { key: 'closed', label: 'Закрытые' },
];

export function TicketList({ store }: { store: ChatStore }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
      {/* Search */}
      <div className="border-b border-slate-800 p-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            value={store.search}
            onChange={(e) => store.setSearch(e.target.value)}
            placeholder="Поиск: #номер, имя, @username"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>

        {/* Scope tabs */}
        <div className="mt-3 flex gap-1">
          {SCOPES.map((s) => {
            const active = store.scope === s.key;
            const count = s.countKey ? store.counts[s.countKey] : undefined;
            return (
              <button
                key={s.key}
                onClick={() => store.setScope(s.key)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                  active ? 'bg-indigo-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
                {count !== undefined && count > 0 && (
                  <span className={`ml-1 ${active ? 'text-indigo-200' : 'text-slate-500'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {store.loadingList && store.tickets.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">Загрузка…</div>
        )}
        {!store.loadingList && store.tickets.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            <div className="mb-2 text-2xl">📭</div>
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
              className={`flex w-full items-start gap-3 border-b border-slate-800/60 px-3 py-3 text-left transition ${
                selected ? 'bg-indigo-600/15' : 'hover:bg-slate-800/40'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                  t.customer.id,
                )}`}
              >
                {initials(t.customer)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-100">{customerName(t.customer)}</span>
                  <span className="shrink-0 text-[11px] text-slate-500">{relativeDay(t.lastMessageAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">#{t.number}</span>
                  <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${badge.className}`}>
                    <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-400">{t.subject || 'Без темы'}</span>
                  {t.unreadForOperator > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white">
                      {t.unreadForOperator}
                    </span>
                  )}
                </div>
                {t.assignedOperatorName && t.status === 'OPEN' && (
                  <div className="mt-1 truncate text-[10px] text-slate-500">👤 {t.assignedOperatorName}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
