import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Settings,
  Users,
  LogOut,
  BarChart3,
  SquareKanban,
  Search,
  PlusCircle,
  Inbox,
  Clock,
  ArrowDownUp,
  LayoutList,
  UserCheck,
  Archive,
  Sun,
  Moon,
  Star,
} from 'lucide-react';
import { getTheme, setTheme, type Theme } from '../lib/theme';
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
import { RatingsBoard } from './RatingsBoard';
import { ClaimFlow } from './ClaimFlow';
import { CommandPalette, type Command } from './CommandPalette';

export function Dashboard() {
  const { operator, logout } = useAuth();
  const store = useChatStore(operator!);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [persona, setPersonaState] = useState(getPersona());
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [operators, setOperators] = useState<Operator[]>([]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

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

  // "Взять следующий": select the longest-waiting unassigned ticket, then open
  // the role/name picker on it.
  const openClaimNext = async () => {
    const t = await store.peekNextUnassigned();
    if (t) setClaimOpen(true);
  };

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

  // ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isAdmin = operator!.role === 'ADMIN';
  const { setScope, setSort, claimNext } = store;

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'claim-next',
        label: 'Взять следующий тикет',
        hint: 'Самый давний неотвеченный',
        icon: <PlusCircle size={15} />,
        keywords: 'claim next очередь взять',
        run: () => claimNext(getPersona() || undefined).catch(() => {}),
      },
      { id: 'jira', label: 'Открыть доску Jira', icon: <SquareKanban size={15} />, keywords: 'задачи board', run: () => setJiraOpen(true) },
      { id: 'analytics', label: 'Открыть обзор и метрики', icon: <BarChart3 size={15} />, keywords: 'аналитика stats метрики', run: () => setAnalyticsOpen(true) },
      { id: 'ratings', label: 'Оценки качества', icon: <Star size={15} />, keywords: 'оценки рейтинг звёзды quality', run: () => setRatingsOpen(true) },
      { id: 'settings', label: 'Настройки', icon: <Settings size={15} />, keywords: 'settings уведомления звук', run: () => setSettingsOpen(true) },
      { id: 'scope-all', label: 'Все тикеты', icon: <LayoutList size={15} />, keywords: 'вкладка все open', run: () => setScope('all') },
      { id: 'scope-unassigned', label: 'Новые (не взятые)', icon: <Inbox size={15} />, keywords: 'вкладка новые unassigned', run: () => setScope('unassigned') },
      { id: 'scope-mine', label: 'Мои тикеты', icon: <UserCheck size={15} />, keywords: 'вкладка мои mine', run: () => setScope('mine') },
      { id: 'scope-closed', label: 'Закрытые', icon: <Archive size={15} />, keywords: 'вкладка закрытые closed', run: () => setScope('closed') },
      { id: 'sort-waiting', label: 'Сортировать: дольше ждут', icon: <Clock size={15} />, keywords: 'сортировка sla', run: () => setSort('waiting') },
      { id: 'sort-recent', label: 'Сортировать: недавние', icon: <ArrowDownUp size={15} />, keywords: 'сортировка recent', run: () => setSort('recent') },
    ];
    if (isAdmin) {
      list.splice(4, 0, {
        id: 'operators',
        label: 'Управление операторами',
        icon: <Users size={15} />,
        keywords: 'операторы команда team',
        run: () => setAdminOpen(true),
      });
    }
    return list;
  }, [claimNext, setScope, setSort, isAdmin]);

  return (
    <div className="flex h-full flex-col p-2 text-slate-100 sm:p-3">
      {/* Header */}
      <header className="panel z-20 mb-2 flex h-16 shrink-0 items-center justify-between gap-2 rounded-[26px] px-2.5 sm:mb-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="accent flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white sm:h-10 sm:w-10">
            <Shield size={20} strokeWidth={2} />
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <div className="truncate text-[15px] font-semibold tracking-tight text-slate-100">Atlas&nbsp;Secure</div>
            <div className="label text-[9px] text-slate-500">Панель поддержки</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="tile tile-hover flex h-8 shrink-0 items-center gap-2 rounded-full px-2 text-slate-400 transition active:scale-95 sm:h-9 sm:px-2.5"
            title="Поиск и команды (⌘K)"
          >
            <Search size={16} />
            <span className="hidden text-[11px] font-medium lg:inline">Команды</span>
            <kbd className="hidden rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-slate-400 lg:inline">
              ⌘K
            </kbd>
          </button>

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
            onClick={() => setRatingsOpen(true)}
            className="tile tile-hover flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95 sm:h-9 sm:w-9"
            title="Оценки качества"
          >
            <Star size={17} />
          </button>

          <button
            onClick={() => setAnalyticsOpen(true)}
            className="tile tile-hover flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95 sm:h-9 sm:w-9"
            title="Аналитика"
          >
            <BarChart3 size={17} />
          </button>

          <button
            onClick={toggleTheme}
            className="tile tile-hover hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95 sm:flex"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
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
        <TicketList
          store={store}
          onClaimNext={openClaimNext}
          className={hasSelection ? 'hidden lg:flex' : 'flex'}
        />
        <ChatPanel
          store={store}
          operatorId={operator!.id}
          persona={persona}
          className={hasSelection ? 'flex' : 'hidden lg:flex'}
          onBack={store.deselect}
          onToggleInfo={() => setInfoOpen(true)}
          onClaim={() => setClaimOpen(true)}
        />

        {/* Info: static column on xl, slide-over drawer below xl */}
        <InfoPanel
          store={store}
          persona={persona}
          operators={operators}
          variant="column"
          onOpenBoard={() => setJiraOpen(true)}
          onClaim={() => setClaimOpen(true)}
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
            onClaim={() => setClaimOpen(true)}
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
      {ratingsOpen && (
        <RatingsBoard
          store={store}
          onClose={() => setRatingsOpen(false)}
          onOpenChat={(ticketId) => selectTicket(ticketId).catch(() => {})}
        />
      )}
      {claimOpen && store.selected && (
        <ClaimFlow
          ticket={store.selected}
          onConfirm={(p) => store.claim(p)}
          onClose={() => setClaimOpen(false)}
        />
      )}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      {paletteOpen && (
        <CommandPalette
          store={store}
          commands={commands}
          onSelectTicket={(id) => selectTicket(id).catch(() => {})}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}
