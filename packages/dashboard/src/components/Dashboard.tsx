import { useEffect, useState } from 'react';
import { Shield, Settings, Users, LogOut, BarChart3, SquareKanban } from 'lucide-react';
import { useAuth } from '../store';
import { useChatStore } from '../useChatStore';
import { api } from '../api';
import { getPersona, setPersona as savePersona } from '../lib/personas';
import type { Operator } from '../types';
import { TicketList } from './TicketList';
import { ChatPanel } from './ChatPanel';
import { InfoPanel } from './InfoPanel';
import { AdminPanel } from './AdminPanel';
import { SettingsModal } from './SettingsModal';
import { AnalyticsModal } from './AnalyticsModal';
import { JiraBoard } from './JiraBoard';

export function Dashboard() {
  const { operator, logout } = useAuth();
  const store = useChatStore(operator!);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [persona, setPersonaState] = useState(getPersona());
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    api.listOperators().then((r) => setOperators(r.operators)).catch(() => {});
  }, []);

  const changePersona = (v: string) => {
    setPersonaState(v);
    savePersona(v);
  };

  const hasSelection = store.selectedId !== null;
  const { selectTicket } = store;
  const jiraActive = store.jiraTasks.filter((j) => j.status !== 'DONE').length;

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
    <div className="flex h-full flex-col p-2 text-slate-100 sm:p-3">
      {/* Header */}
      <header className="panel z-20 mb-2 flex h-16 shrink-0 items-center justify-between gap-2 rounded-[26px] px-2.5 sm:mb-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="accent flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white sm:h-10 sm:w-10">
            <Shield size={20} strokeWidth={2} />
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <div className="truncate text-[15px] font-semibold tracking-tight text-white">Atlas&nbsp;Secure</div>
            <div className="label text-[9px] text-slate-500">Панель поддержки</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <span
            className={`tile flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition sm:px-2.5 ${
              store.connected ? 'text-emerald-300' : 'text-rose-300'
            }`}
            title={store.connected ? 'Соединение активно' : 'Переподключение…'}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                store.connected
                  ? 'bg-emerald-400'
                  : 'animate-pulse-glow bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline">{store.connected ? 'Онлайн' : 'Оффлайн'}</span>
          </span>

          <button
            onClick={() => setJiraOpen(true)}
            className="tile tile-hover relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95 sm:h-9 sm:w-9"
            title="Доска Jira"
          >
            <SquareKanban size={17} />
            {jiraActive > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-semibold text-white">
                {jiraActive}
              </span>
            )}
          </button>

          <button
            onClick={() => setAnalyticsOpen(true)}
            className="tile tile-hover flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95 sm:h-9 sm:w-9"
            title="Аналитика"
          >
            <BarChart3 size={17} />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="tile tile-hover flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95 sm:h-9 sm:w-9"
            title="Настройки и уведомления"
          >
            <Settings size={17} />
          </button>

          {operator!.role === 'ADMIN' && (
            <button
              onClick={() => setAdminOpen(true)}
              className="tile tile-hover flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-medium text-slate-300 transition active:scale-95 sm:h-9 sm:w-9 lg:w-auto lg:px-3"
              title="Операторы"
            >
              <Users size={16} />
              <span className="hidden lg:inline">Операторы</span>
            </button>
          )}

          <div className="tile hidden shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:flex md:pr-3">
            <div className="accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
              {operator!.displayName.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-xs font-medium text-slate-200 md:inline">
              {operator!.displayName}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.06] hover:text-rose-400 sm:h-9 sm:w-9"
            title="Выйти"
          >
            <LogOut size={17} />
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
        <InfoPanel
          store={store}
          persona={persona}
          operators={operators}
          variant="column"
          onOpenBoard={() => setJiraOpen(true)}
        />
        {infoOpen && hasSelection && (
          <InfoPanel
            store={store}
            persona={persona}
            operators={operators}
            variant="drawer"
            onClose={() => setInfoOpen(false)}
            onOpenBoard={() => {
              setInfoOpen(false);
              setJiraOpen(true);
            }}
          />
        )}
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          persona={persona}
          onPersonaChange={changePersona}
          isAdmin={operator!.role === 'ADMIN'}
        />
      )}
      {analyticsOpen && <AnalyticsModal onClose={() => setAnalyticsOpen(false)} />}
      {jiraOpen && (
        <JiraBoard
          store={store}
          onClose={() => setJiraOpen(false)}
          onOpenChat={(ticketId) => selectTicket(ticketId).catch(() => {})}
        />
      )}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
