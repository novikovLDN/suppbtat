import { useMemo, useState } from 'react';
import {
  X,
  SquareKanban,
  Search,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  ChevronLeft,
  Clock,
  User,
  BellRing,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { ChatStore } from '../useChatStore';
import type { JiraStatus, JiraTask } from '../types';
import {
  avatarColor,
  customerName,
  dateTime,
  initials,
  jiraStatusMeta,
  JIRA_STATUSES,
  priorityMeta,
  relativeDay,
} from '../lib/format';

interface Props {
  store: ChatStore;
  onClose: () => void;
  onOpenChat: (ticketId: number) => void;
}

export function JiraBoard({ store, onClose, onOpenChat }: Props) {
  const [query, setQuery] = useState('');
  const [mobileStatus, setMobileStatus] = useState<JiraStatus>('WAITING');
  const [detail, setDetail] = useState<JiraTask | null>(null);

  const tasks = store.jiraTasks;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((j) => {
      const hay = [
        j.key,
        j.title,
        j.comment ?? '',
        j.description ?? '',
        customerName(j.customer),
        j.customer.username ?? '',
        `#${j.ticketNumber}`,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, query]);

  const byStatus = (s: JiraStatus) => filtered.filter((j) => j.status === s);

  // keep the detail view in sync with live updates
  const liveDetail = detail ? tasks.find((t) => t.id === detail.id) ?? detail : null;

  const goToChat = (ticketId: number) => {
    onOpenChat(ticketId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm animate-overlay sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:h-[88dvh] sm:max-w-6xl sm:rounded-3xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <SquareKanban size={16} /> Доска Jira
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-400">
              {tasks.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="tile hidden items-center gap-1.5 rounded-full px-3 py-1.5 sm:flex">
              <Search size={13} className="text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск задач…"
                className="w-40 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
              />
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="shrink-0 border-b border-white/[0.06] px-4 py-2.5 sm:hidden">
          <div className="tile flex items-center gap-1.5 rounded-full px-3 py-2">
            <Search size={14} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск задач…"
              className="w-full bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Mobile status tabs */}
        <div className="flex shrink-0 gap-1 border-b border-white/[0.06] p-2 sm:hidden">
          {JIRA_STATUSES.map((s) => {
            const m = jiraStatusMeta(s);
            const active = mobileStatus === s;
            const count = byStatus(s).length;
            return (
              <button
                key={s}
                onClick={() => setMobileStatus(s)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium transition ${
                  active ? 'bg-white/[0.08] text-white' : 'text-slate-400'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                {m.short}
                <span className="text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Board */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* Desktop: 3 columns */}
          <div className="hidden h-full gap-3 overflow-x-auto p-4 sm:flex">
            {JIRA_STATUSES.map((s) => (
              <Column
                key={s}
                status={s}
                tasks={byStatus(s)}
                onMove={store.updateJira}
                onOpen={setDetail}
              />
            ))}
          </div>

          {/* Mobile: single active column */}
          <div className="h-full overflow-y-auto p-3 sm:hidden">
            <div className="space-y-2.5">
              {byStatus(mobileStatus).length === 0 ? (
                <EmptyColumn />
              ) : (
                byStatus(mobileStatus).map((j) => (
                  <Card key={j.id} task={j} onMove={store.updateJira} onOpen={setDetail} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {liveDetail && (
        <JiraDetail
          task={liveDetail}
          onClose={() => setDetail(null)}
          onMove={store.updateJira}
          onNotifyDone={() => store.notifyJiraDone(liveDetail.id)}
          onGoToChat={() => goToChat(liveDetail.ticketId)}
        />
      )}
    </div>
  );
}

function Column({
  status,
  tasks,
  onMove,
  onOpen,
}: {
  status: JiraStatus;
  tasks: JiraTask[];
  onMove: (id: number, s: JiraStatus) => void;
  onOpen: (t: JiraTask) => void;
}) {
  const m = jiraStatusMeta(status);
  return (
    <div className="flex w-[320px] shrink-0 flex-col rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.05]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-3">
        <span className={`flex items-center gap-2 text-[12px] font-semibold ${m.column}`}>
          <span className={`h-2 w-2 rounded-full ${m.dot}`} />
          {m.label}
        </span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-400">
          {tasks.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
        {tasks.length === 0 ? (
          <EmptyColumn />
        ) : (
          tasks.map((j) => <Card key={j.id} task={j} onMove={onMove} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="tile flex h-11 w-11 items-center justify-center rounded-2xl text-slate-600">
        <SquareKanban size={18} />
      </div>
      <p className="text-[12px] text-slate-500">Пусто</p>
    </div>
  );
}

function Card({
  task,
  onMove,
  onOpen,
}: {
  task: JiraTask;
  onMove: (id: number, s: JiraStatus) => void;
  onOpen: (t: JiraTask) => void;
}) {
  const pr = priorityMeta(task.priority);
  const problem = task.comment || task.description || task.title;
  return (
    <div className="animate-fade-in rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.05] transition hover:ring-white/10">
      <button onClick={() => onOpen(task)} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-indigo-300">{task.key}</span>
          <span className="font-mono text-[10px] text-slate-500">#{task.ticketNumber}</span>
        </div>

        <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-slate-200">{problem}</p>

        <div className="mt-2.5 flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${avatarColor(
              task.customer.id,
            )}`}
          >
            {initials(task.customer)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
            {customerName(task.customer)}
          </span>
          {pr.show && (
            <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset ${pr.chip}`}>
              <span className={`h-1 w-1 rounded-full ${pr.dot}`} />
              {pr.label}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-600">
          <Clock size={10} /> {relativeDay(task.createdAt)}
          {task.createdByName && <span className="truncate">· {task.createdByName}</span>}
        </div>
      </button>

      {/* Status mover */}
      <div className="mt-2.5 flex gap-1 rounded-full bg-white/[0.03] p-1">
        {JIRA_STATUSES.map((s) => {
          const m = jiraStatusMeta(s);
          const active = task.status === s;
          return (
            <button
              key={s}
              onClick={() => !active && onMove(task.id, s)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full py-1 text-[10px] font-medium transition ${
                active ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title={m.label}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
              <span className="hidden xl:inline">{m.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JiraDetail({
  task,
  onClose,
  onMove,
  onNotifyDone,
  onGoToChat,
}: {
  task: JiraTask;
  onClose: () => void;
  onMove: (id: number, s: JiraStatus) => void;
  onNotifyDone: () => Promise<void>;
  onGoToChat: () => void;
}) {
  const m = jiraStatusMeta(task.status);
  const pr = priorityMeta(task.priority);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const notifyDone = async () => {
    setNotifying(true);
    try {
      await onNotifyDone();
      setNotified(true);
    } catch {
      /* surfaced elsewhere; keep button usable */
    } finally {
      setNotifying(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 pb-safe backdrop-blur-sm animate-overlay sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="panel animate-slide-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[85dvh] sm:max-w-lg sm:rounded-3xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <button onClick={onClose} className="flex items-center gap-1 text-[13px] text-slate-400 transition hover:text-slate-200 sm:hidden">
            <ChevronLeft size={16} /> Назад
          </button>
          <h3 className="hidden items-center gap-2 text-sm font-semibold text-white sm:flex">
            <span className="font-mono text-indigo-300">{task.key}</span>
          </h3>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${m.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
            {m.label}
          </span>
          <button onClick={onClose} className="hidden h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] sm:flex">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          {/* Customer */}
          <div className="flex items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold ${avatarColor(task.customer.id)}`}>
              {initials(task.customer)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{customerName(task.customer)}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-mono text-indigo-300 sm:hidden">{task.key}</span>
                <span className="font-mono">#{task.ticketNumber}</span>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="mt-4 space-y-1">
            <CopyRow label="Telegram ID" value={task.customer.id} />
            {task.customer.username && <CopyRow label="Username" value={`@${task.customer.username}`} />}
            <InfoRow label="Тикет" value={`#${task.ticketNumber}`} />
            <InfoRow label="Статус тикета" value={task.ticketStatus === 'OPEN' ? 'Открыт' : 'Закрыт'} />
            {pr.show && <InfoRow label="Приоритет" value={pr.label} />}
            <InfoRow label="Создал" value={task.createdByName || '—'} />
            <InfoRow label="Создана" value={dateTime(task.createdAt)} />
          </div>

          {task.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {task.tags.map((tg) => (
                <span key={tg} className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] text-slate-300">
                  {tg}
                </span>
              ))}
            </div>
          )}

          {/* Problem (from chat) */}
          <div className="mt-4">
            <div className="label mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <User size={11} /> Проблема (из переписки)
            </div>
            <div className="whitespace-pre-wrap rounded-2xl bg-white/[0.03] p-3 text-[13px] leading-relaxed text-slate-200 ring-1 ring-inset ring-white/[0.05]">
              {task.description || task.title || '—'}
            </div>
          </div>

          {/* Comment */}
          {task.comment && (
            <div className="mt-3">
              <div className="label mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                <MessageSquare size={11} /> Комментарий
              </div>
              <div className="whitespace-pre-wrap rounded-2xl bg-white/[0.03] p-3 text-[13px] leading-relaxed text-slate-200 ring-1 ring-inset ring-white/[0.05]">
                {task.comment}
              </div>
            </div>
          )}

          {/* Status changer */}
          <div className="mt-4">
            <div className="label mb-1.5 text-[10px] text-slate-500">Статус</div>
            <div className="flex gap-1 rounded-full bg-white/[0.03] p-1">
              {JIRA_STATUSES.map((s) => {
                const sm = jiraStatusMeta(s);
                const active = task.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => !active && onMove(task.id, s)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-medium transition ${
                      active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                    {sm.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-4">
          {task.status === 'DONE' && (
            <button
              onClick={notifyDone}
              disabled={notifying || notified}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition active:scale-[0.98] ${
                notified
                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20'
                  : 'bg-white/[0.05] text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]'
              } disabled:cursor-default`}
            >
              {notified ? (
                <>
                  <CheckCircle2 size={16} /> Клиент уведомлён
                </>
              ) : notifying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Отправка…
                </>
              ) : (
                <>
                  <BellRing size={16} /> Уведомить клиента о завершении
                </>
              )}
            </button>
          )}
          <button
            onClick={onGoToChat}
            className="accent flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <ExternalLink size={16} /> Перейти в диалог
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-2">
      <span className="label text-[10px] text-slate-500">{label}</span>
      <span className="text-right text-[13px] font-medium text-slate-200">{value}</span>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        })
      }
      className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <span className="label text-[10px] text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-right font-mono text-[13px] font-medium text-slate-200">{value}</span>
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-slate-600" />}
      </span>
    </button>
  );
}
