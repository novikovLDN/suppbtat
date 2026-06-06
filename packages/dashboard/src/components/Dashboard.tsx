import { useEffect, useState } from 'react';
import { useAuth } from '../store';
import { useChatStore } from '../useChatStore';
import { TicketList } from './TicketList';
import { ChatPanel } from './ChatPanel';
import { InfoPanel } from './InfoPanel';
import { AdminPanel } from './AdminPanel';
import { SettingsModal } from './SettingsModal';

export function Dashboard() {
  const { operator, logout } = useAuth();
  const store = useChatStore(operator!);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const hasSelection = store.selectedId !== null;
  const { selectTicket } = store;

  // Open a ticket from a push-notification tap (?ticket= or SW message).
  useEffect(() => {
    const param = new URLSearchParams(location.search).get('ticket');
    if (param) {
      const id = Number(param);
      if (Number.isFinite(id)) selectTicket(id).catch(() => {});
      const p = new URLSearchParams(location.search);
      p.delete('ticket');
      window.history.replaceState({}, '', location.pathname + (p.toString() ? `?${p}` : ''));
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-ticket' && e.data.ticketId) {
        selectTicket(Number(e.data.ticketId)).catch(() => {});
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [selectTicket]);

  return (
    <div className="flex h-full flex-col text-slate-100">
      {/* Header */}
      <header className="glass z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-lg shadow-indigo-500/30">
            🛡️
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Atlas&nbsp;Secure</div>
            <div className="hidden text-[11px] text-slate-400 sm:block">Панель поддержки</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset transition ${
              store.connected
                ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25'
                : 'bg-rose-400/10 text-rose-300 ring-rose-400/25'
            }`}
            title={store.connected ? 'Соединение активно' : 'Переподключение…'}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                store.connected
                  ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]'
                  : 'animate-pulse-glow bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline">{store.connected ? 'Онлайн' : 'Оффлайн'}</span>
          </span>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-slate-200 transition hover:bg-white/10 active:scale-95"
            title="Настройки и уведомления"
          >
            ⚙️
          </button>

          {operator!.role === 'ADMIN' && (
            <button
              onClick={() => setAdminOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 active:scale-95"
            >
              <span className="sm:hidden">👥</span>
              <span className="hidden sm:inline">👥 Операторы</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold shadow-md shadow-indigo-500/25">
              {operator!.displayName.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-xs text-slate-300 md:inline">{operator!.displayName}</span>
          </div>

          <button
            onClick={logout}
            className="rounded-xl px-2 py-1.5 text-xs text-slate-400 transition hover:text-rose-300"
            title="Выйти"
          >
            <span className="md:hidden">⎋</span>
            <span className="hidden md:inline">Выход</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        <TicketList store={store} className={hasSelection ? 'hidden lg:flex' : 'flex'} />
        <ChatPanel
          store={store}
          operatorId={operator!.id}
          className={hasSelection ? 'flex' : 'hidden lg:flex'}
          onBack={store.deselect}
          onToggleInfo={() => setInfoOpen(true)}
        />

        {/* Info: static column on xl, slide-over drawer below xl */}
        <InfoPanel store={store} variant="column" />
        {infoOpen && hasSelection && (
          <InfoPanel store={store} variant="drawer" onClose={() => setInfoOpen(false)} />
        )}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
