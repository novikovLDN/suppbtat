import type { ChatStore } from '../useChatStore';
import { avatarColor, customerName, dateTime, initials, statusBadge } from '../lib/format';

export function InfoPanel({ store }: { store: ChatStore }) {
  const t = store.selected;
  if (!t) {
    return <aside className="hidden w-72 shrink-0 border-l border-slate-800 bg-slate-900/40 xl:block" />;
  }

  const badge = statusBadge(t);
  const open = t.status === 'OPEN';
  const assigned = t.assignedOperatorId !== null;

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-slate-900/40 xl:flex">
      <div className="flex flex-col items-center border-b border-slate-800 p-5 text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold ${avatarColor(
            t.customer.id,
          )}`}
        >
          {initials(t.customer)}
        </div>
        <div className="mt-3 font-medium text-slate-100">{customerName(t.customer)}</div>
        {t.customer.username && <div className="text-xs text-slate-500">@{t.customer.username}</div>}
        <span className={`mt-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      <div className="space-y-3 border-b border-slate-800 p-4 text-xs">
        <Row label="Тикет" value={`#${t.number}`} />
        <Row label="Telegram ID" value={t.customer.id} />
        <Row label="Создан" value={dateTime(t.createdAt)} />
        <Row label="Активность" value={dateTime(t.lastMessageAt)} />
        <Row label="Оператор" value={t.assignedOperatorName || 'не назначен'} />
        {t.closedAt && <Row label="Закрыт" value={dateTime(t.closedAt)} />}
      </div>

      {/* Actions */}
      <div className="space-y-2 p-4">
        {open && !assigned && (
          <button
            onClick={() => store.claim()}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            ✋ Взять в работу
          </button>
        )}
        {open && assigned && (
          <button
            onClick={() => store.release()}
            className="w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            ↩️ Вернуть в очередь
          </button>
        )}
        {open && (
          <button
            onClick={() => store.close()}
            className="w-full rounded-lg border border-rose-700/60 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
          >
            🔒 Закрыть тикет
          </button>
        )}
        {!open && (
          <button
            onClick={() => store.reopen()}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            🔓 Переоткрыть тикет
          </button>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}
