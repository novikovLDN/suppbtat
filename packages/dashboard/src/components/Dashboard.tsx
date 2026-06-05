import { useState } from 'react';
import { useAuth } from '../store';
import { useChatStore } from '../useChatStore';
import { TicketList } from './TicketList';
import { ChatPanel } from './ChatPanel';
import { InfoPanel } from './InfoPanel';
import { AdminPanel } from './AdminPanel';

export function Dashboard() {
  const { operator, logout } = useAuth();
  const store = useChatStore(operator!);
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-lg">🛡️</div>
          <div>
            <div className="text-sm font-semibold leading-tight">Atlas Secure</div>
            <div className="text-[11px] leading-tight text-slate-500">Панель поддержки</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
              store.connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}
            title={store.connected ? 'Соединение активно' : 'Переподключение…'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${store.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {store.connected ? 'Онлайн' : 'Оффлайн'}
          </span>

          {operator!.role === 'ADMIN' && (
            <button
              onClick={() => setAdminOpen(true)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
            >
              ⚙️ Операторы
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium">
              {operator!.displayName.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-xs text-slate-300">{operator!.displayName}</span>
          </div>

          <button
            onClick={logout}
            className="rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:text-rose-300"
            title="Выйти"
          >
            Выход
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <TicketList store={store} />
        <ChatPanel store={store} operatorId={operator!.id} />
        <InfoPanel store={store} />
      </div>

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
