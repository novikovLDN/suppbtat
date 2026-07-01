import { useEffect, useState } from 'react';
import { useAuth } from '../store';
import { useChatStore } from '../useChatStore';
import { getPersona, setPersona as savePersona } from '../lib/personas';
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
  const [persona, setPersonaState] = useState(getPersona());

  const changePersona = (v: string) => {
    setPersonaState(v);
    savePersona(v);
  };

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
    <div className="flex h-full flex-col p-2 text-slate-900 sm:p-3">
      {/* Header */}
      <header className="panel z-20 mb-2 flex h-16 shrink-0 items-center justify-between rounded-2xl px-3 sm:mb-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb] text-lg text-white shadow-lg shadow-blue-500/30">
            🛡️
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Atlas&nbsp;Secure</div>
            <div className="hidden text-[11px] text-slate-400 sm:block">Панель поддержки</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-inset transition ${
              store.connected
                ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                : 'bg-rose-50 text-rose-600 ring-rose-200'
            }`}
            title={store.connected ? 'Соединение активно' : 'Переподключение…'}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                store.connected ? 'bg-emerald-500' : 'animate-pulse-glow bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline">{store.connected ? 'Онлайн' : 'Оффлайн'}</span>
          </span>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-600 transition hover:bg-slate-100 active:scale-95"
            title="Настройки и уведомления"
          >
            ⚙️
          </button>

          {operator!.role === 'ADMIN' && (
            <button
              onClick={() => setAdminOpen(true)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              <span className="sm:hidden">👥</span>
              <span className="hidden sm:inline">👥 Операторы</span>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-1 md:pr-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-xs font-semibold text-white">
              {operator!.displayName.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-xs font-medium text-slate-600 md:inline">
              {operator!.displayName}
            </span>
          </div>

          <button
            onClick={logout}
            className="rounded-full px-2 py-2 text-xs text-slate-400 transition hover:text-rose-500"
            title="Выйти"
          >
            <span className="md:hidden">⎋</span>
            <span className="hidden md:inline">Выход</span>
          </button>
        </div>
      </header>

      {/* Body — floating panels with gaps */}
      <div className="relative flex min-h-0 flex-1 gap-2 sm:gap-3">
        <TicketList store={store} className={hasSelection ? 'hidden lg:flex' : 'flex'} />
        <ChatPanel
          store={store}
          operatorId={operator!.id}
          persona={persona}
          className={hasSelection ? 'flex' : 'hidden lg:flex'}
          onBack={store.deselect}
          onToggleInfo={() => setInfoOpen(true)}
        />

        {/* Info: static column on xl, slide-over drawer below xl */}
        <InfoPanel store={store} persona={persona} variant="column" />
        {infoOpen && hasSelection && (
          <InfoPanel store={store} persona={persona} variant="drawer" onClose={() => setInfoOpen(false)} />
        )}
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          persona={persona}
          onPersonaChange={changePersona}
        />
      )}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
