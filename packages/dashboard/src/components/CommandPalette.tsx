import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, Hash } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ChatStore } from '../useChatStore';
import { avatarColor, customerName, initials, statusBadge } from '../lib/format';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

interface Props {
  store: ChatStore;
  commands: Command[];
  onSelectTicket: (id: number) => void;
  onClose: () => void;
}

export function CommandPalette({ store, commands, onSelectTicket, onClose }: Props) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const query = q.trim().toLowerCase();

  const ticketMatches = useMemo(() => {
    const list = store.tickets;
    if (!query) return list.slice(0, 6);
    return list
      .filter((t) => {
        const hay = `#${t.number} ${customerName(t.customer)} ${t.customer.username ?? ''} ${t.subject ?? ''}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 6);
  }, [store.tickets, query]);

  const actionMatches = useMemo(() => {
    if (!query) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(query));
  }, [commands, query]);

  // Flatten to a single navigable list: actions first, then tickets.
  const items = useMemo(
    () => [
      ...actionMatches.map((c) => ({ type: 'action' as const, cmd: c })),
      ...ticketMatches.map((t) => ({ type: 'ticket' as const, ticket: t })),
    ],
    [actionMatches, ticketMatches],
  );

  useEffect(() => setActive(0), [q]);

  const choose = (i: number) => {
    const it = items[i];
    if (!it) return;
    if (it.type === 'action') it.cmd.run();
    else onSelectTicket(it.ticket.id);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const actionCount = actionMatches.length;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-3 pt-[12vh] backdrop-blur-sm animate-overlay sm:pt-[14vh]"
      onClick={onClose}
    >
      <div
        className="panel animate-scale-in flex max-h-[72vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
          <Search size={16} className="shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Найти тикет или команду…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-slate-500">Ничего не найдено</div>
          )}

          {actionMatches.length > 0 && (
            <div className="label px-2 pb-1 pt-1.5 text-[9px] text-slate-600">Команды</div>
          )}
          {actionMatches.map((c, i) => (
            <Row key={c.id} idx={i} active={active === i} onHover={() => setActive(i)} onClick={() => choose(i)}>
              <span className="tile flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300">
                {c.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-100">{c.label}</span>
                {c.hint && <span className="block truncate text-[11px] text-slate-500">{c.hint}</span>}
              </span>
              {active === i && <EnterHint />}
            </Row>
          ))}

          {ticketMatches.length > 0 && (
            <div className="label px-2 pb-1 pt-2.5 text-[9px] text-slate-600">Тикеты</div>
          )}
          {ticketMatches.map((t, j) => {
            const i = actionCount + j;
            const badge = statusBadge(t);
            return (
              <Row key={t.id} idx={i} active={active === i} onHover={() => setActive(i)} onClick={() => choose(i)}>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${avatarColor(
                    t.customer.id,
                  )}`}
                >
                  {initials(t.customer)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm text-slate-100">{customerName(t.customer)}</span>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badge.className}`}>
                      <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                    <Hash size={9} className="shrink-0" />
                    {t.number} · {t.subject || 'Без темы'}
                  </span>
                </span>
                {active === i && <EnterHint />}
              </Row>
            );
          })}
        </div>

        <div className="hidden items-center gap-4 border-t border-white/[0.06] px-4 py-2 text-[10px] text-slate-600 sm:flex">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> навигация</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> открыть</span>
          <span className="flex items-center gap-1"><Kbd>esc</Kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  idx,
  active,
  onHover,
  onClick,
  children,
}: {
  idx: number;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      data-idx={idx}
      onMouseMove={onHover}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
        active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </button>
  );
}

function EnterHint() {
  return (
    <span className="hidden shrink-0 items-center gap-1 text-[10px] text-slate-500 sm:flex">
      <CornerDownLeft size={12} />
    </span>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium text-slate-400">{children}</kbd>;
}
