import type { ChatStore } from '../useChatStore';
import { avatarColor, customerName, dateTime, initials, statusBadge } from '../lib/format';

interface Props {
  store: ChatStore;
  variant: 'column' | 'drawer';
  persona: string;
  onClose?: () => void;
}

export function InfoPanel({ store, variant, persona, onClose }: Props) {
  const t = store.selected;

  if (variant === 'column') {
    // Static third column — only on very wide screens.
    return (
      <aside className="panel hidden w-[300px] shrink-0 flex-col overflow-y-auto rounded-2xl xl:flex">
        {t ? <Body store={store} persona={persona} /> : null}
      </aside>
    );
  }

  // Drawer (slide-over) for < xl screens.
  return (
    <div className="fixed inset-0 z-40 flex justify-end xl:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <aside
        className="animate-slide-in-right relative flex h-full w-[88%] max-w-sm flex-col overflow-y-auto border-l border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
        >
          ✕
        </button>
        {t ? <Body store={store} persona={persona} /> : null}
      </aside>
    </div>
  );
}

function Body({ store, persona }: { store: ChatStore; persona: string }) {
  const t = store.selected!;
  const badge = statusBadge(t);
  const open = t.status === 'OPEN';
  const assigned = t.assignedOperatorId !== null;

  return (
    <>
      <div className="flex flex-col items-center border-b border-slate-100 p-6 text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-semibold ${avatarColor(
            t.customer.id,
          )}`}
        >
          {initials(t.customer)}
        </div>
        <div className="mt-3 font-semibold text-slate-900">{customerName(t.customer)}</div>
        {t.customer.username && <div className="text-xs text-slate-400">@{t.customer.username}</div>}
        <span
          className={`mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      <div className="space-y-2.5 border-b border-slate-100 p-4 text-xs">
        <Row label="Тикет" value={`#${t.number}`} mono />
        <Row label="Telegram ID" value={t.customer.id} mono />
        <Row label="Создан" value={dateTime(t.createdAt)} />
        <Row label="Активность" value={dateTime(t.lastMessageAt)} />
        <Row label="Оператор" value={t.assignedOperatorName || 'не назначен'} />
        <Row label="Имя для клиента" value={t.assignedName || '—'} />
        {t.closedAt && <Row label="Закрыт" value={dateTime(t.closedAt)} />}
      </div>

      <div className="space-y-2 p-4">
        {open && !assigned && (
          <>
            <button
              onClick={() => store.claim(persona || undefined)}
              className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8] active:scale-[0.98]"
            >
              ✋ Взять в работу
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Клиент увидит: <span className="font-medium text-blue-600">{persona || 'случайное имя'}</span>
              <br />
              (изменить — в ⚙️ Настройках)
            </p>
          </>
        )}
        {open && assigned && (
          <button
            onClick={() => store.release()}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            ↩️ Вернуть в очередь
          </button>
        )}
        {open && (
          <button
            onClick={() => store.close()}
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-100 active:scale-[0.98]"
          >
            🔒 Закрыть тикет
          </button>
        )}
        {!open && (
          <button
            onClick={() => store.reopen()}
            className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8] active:scale-[0.98]"
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
      <span className="text-slate-400">{label}</span>
      <span className={`text-right font-medium text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
