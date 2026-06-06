import type { ChatStore } from '../useChatStore';
import { avatarColor, customerName, dateTime, initials, statusBadge } from '../lib/format';

interface Props {
  store: ChatStore;
  variant: 'column' | 'drawer';
  onClose?: () => void;
}

export function InfoPanel({ store, variant, onClose }: Props) {
  const t = store.selected;

  if (variant === 'column') {
    // Static third column — only on very wide screens.
    return (
      <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-white/5 xl:flex">
        {t ? <Body store={store} /> : null}
      </aside>
    );
  }

  // Drawer (slide-over) for < xl screens.
  return (
    <div className="fixed inset-0 z-40 flex justify-end xl:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <aside
        className="glass animate-slide-in-right relative flex h-full w-[88%] max-w-sm flex-col overflow-y-auto border-l border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10"
        >
          ✕
        </button>
        {t ? <Body store={store} /> : null}
      </aside>
    </div>
  );
}

function Body({ store }: { store: ChatStore }) {
  const t = store.selected!;
  const badge = statusBadge(t);
  const open = t.status === 'OPEN';
  const assigned = t.assignedOperatorId !== null;

  return (
    <>
      <div className="flex flex-col items-center border-b border-white/5 p-6 text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold ring-1 ring-white/10 ${avatarColor(
            t.customer.id,
          )}`}
        >
          {initials(t.customer)}
        </div>
        <div className="mt-3 font-medium text-slate-100">{customerName(t.customer)}</div>
        {t.customer.username && <div className="text-xs text-slate-500">@{t.customer.username}</div>}
        <span
          className={`mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${badge.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      <div className="space-y-2.5 border-b border-white/5 p-4 text-xs">
        <Row label="Тикет" value={`#${t.number}`} mono />
        <Row label="Telegram ID" value={t.customer.id} mono />
        <Row label="Создан" value={dateTime(t.createdAt)} />
        <Row label="Активность" value={dateTime(t.lastMessageAt)} />
        <Row label="Оператор" value={t.assignedOperatorName || 'не назначен'} />
        {t.closedAt && <Row label="Закрыт" value={dateTime(t.closedAt)} />}
      </div>

      <div className="space-y-2 p-4">
        {open && !assigned && (
          <button
            onClick={() => store.claim()}
            className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98]"
          >
            ✋ Взять в работу
          </button>
        )}
        {open && assigned && (
          <button
            onClick={() => store.release()}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-200 transition hover:bg-white/10 active:scale-[0.98]"
          >
            ↩️ Вернуть в очередь
          </button>
        )}
        {open && (
          <button
            onClick={() => store.close()}
            className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/15 active:scale-[0.98]"
          >
            🔒 Закрыть тикет
          </button>
        )}
        {!open && (
          <button
            onClick={() => store.reopen()}
            className="w-full rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-violet-500 active:scale-[0.98]"
          >
            🔓 Переоткрыть тикет
          </button>
        )}
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
