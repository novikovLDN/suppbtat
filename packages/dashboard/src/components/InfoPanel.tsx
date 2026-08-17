import { useState } from 'react';
import {
  X,
  UserCheck,
  Undo2,
  Lock,
  LockOpen,
  Copy,
  Check,
  Tag,
  ArrowRightLeft,
  Flag,
  Plus,
  SquareKanban,
  ExternalLink,
  Bell,
  BellOff,
  FileText,
  Film,
  Music,
  Download,
} from 'lucide-react';
import type { ChatStore } from '../useChatStore';
import type { Message, Operator, Priority, Ticket } from '../types';
import { mediaUrl } from '../api';
import {
  avatarColor,
  customerName,
  dateTime,
  initials,
  jiraStatusMeta,
  mediaKind,
  priorityMeta,
  PRIORITIES,
  statusBadge,
} from '../lib/format';
import { Lightbox, type ViewerKind } from './Lightbox';

interface Props {
  store: ChatStore;
  variant: 'column' | 'drawer';
  persona: string;
  operators: Operator[];
  onClose?: () => void;
  onOpenBoard?: () => void;
}

export function InfoPanel({ store, variant, persona, operators, onClose, onOpenBoard }: Props) {
  const t = store.selected;

  if (variant === 'column') {
    return (
      <aside className="panel hidden w-[300px] shrink-0 flex-col overflow-y-auto rounded-[26px] xl:flex">
        {t ? <Body store={store} persona={persona} operators={operators} onOpenBoard={onOpenBoard} /> : null}
      </aside>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end xl:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay" />
      <aside
        className="panel animate-slide-in-right relative flex h-full w-[88%] max-w-sm flex-col overflow-y-auto rounded-none"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="tile absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition active:scale-95"
        >
          <X size={16} />
        </button>
        {t ? <Body store={store} persona={persona} operators={operators} onOpenBoard={onOpenBoard} /> : null}
      </aside>
    </div>
  );
}

function Body({
  store,
  persona,
  operators,
  onOpenBoard,
}: {
  store: ChatStore;
  persona: string;
  operators: Operator[];
  onOpenBoard?: () => void;
}) {
  const t = store.selected!;
  const badge = statusBadge(t);
  const open = t.status === 'OPEN';
  const assigned = t.assignedOperatorId !== null;
  const attachments = store.messages.filter((m) => m.mediaFileId);
  const photos = attachments.filter((m) => mediaKind(m.mediaType, m.fileName) === 'image');
  const files = attachments.filter((m) => mediaKind(m.mediaType, m.fileName) !== 'image');
  const [viewer, setViewer] = useState<{ url: string; kind: ViewerKind; name?: string } | null>(null);

  return (
    <>
      <div className="flex flex-col items-center border-b border-white/[0.06] p-6 text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-[22px] text-2xl font-semibold ${avatarColor(
            t.customer.id,
          )}`}
        >
          {initials(t.customer)}
        </div>
        <div className="mt-3 font-semibold text-slate-100">{customerName(t.customer)}</div>
        {t.customer.username && (
          <CopyText className="text-xs text-slate-500" value={`@${t.customer.username}`} />
        )}
        <span
          className={`mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      {/* Priority + tags */}
      {open && (
        <div className="space-y-3 border-b border-white/[0.06] p-4">
          <div>
            <div className="label mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Flag size={11} /> Приоритет
            </div>
            <div className="flex gap-1 rounded-full bg-white/[0.03] p-1">
              {PRIORITIES.map((p) => {
                const active = t.priority === p;
                const m = priorityMeta(p);
                return (
                  <button
                    key={p}
                    onClick={() => store.setMeta({ priority: p })}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-full py-1 text-[10px] font-medium transition ${
                      active ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                    {shortPriority(p)}
                  </button>
                );
              })}
            </div>
          </div>
          <TagsEditor ticket={t} onChange={(tags) => store.setMeta({ tags })} />
        </div>
      )}

      {/* Info rows */}
      <div className="space-y-1 border-b border-white/[0.06] p-3">
        <Row label="Тикет" value={`#${t.number}`} mono copy />
        <Row label="Telegram ID" value={t.customer.id} mono copy />
        {t.customer.username && <Row label="Username" value={`@${t.customer.username}`} copy />}
        <Row label="Создан" value={dateTime(t.createdAt)} />
        <Row label="Активность" value={dateTime(t.lastMessageAt)} />
        <Row label="Имя для клиента" value={t.assignedName || '—'} />
        {t.closedAt && <Row label="Закрыт" value={dateTime(t.closedAt)} />}
      </div>

      {/* Transfer */}
      {open && assigned && operators.length > 1 && (
        <div className="border-b border-white/[0.06] p-4">
          <div className="label mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
            <ArrowRightLeft size={11} /> Оператор
          </div>
          <select
            value={t.assignedOperatorId ?? ''}
            onChange={(e) => store.transfer(Number(e.target.value))}
            className="tile w-full rounded-xl px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
          >
            {operators
              .filter((o) => o.isActive)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.displayName}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 p-4">
        {open && !assigned && (
          <>
            <button
              onClick={() => store.claim(persona || undefined)}
              className="accent flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              <UserCheck size={17} /> Взять в работу
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Клиент увидит:{' '}
              <span className="font-medium text-indigo-300">{persona || 'случайное имя'}</span>
            </p>
          </>
        )}
        {open && assigned && (
          <button
            onClick={() => store.release()}
            className="tile tile-hover flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-slate-200 transition active:scale-[0.98]"
          >
            <Undo2 size={16} /> Вернуть в очередь
          </button>
        )}
        {open && (
          <button
            onClick={() => store.close()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 py-3 text-sm font-medium text-rose-300 ring-1 ring-inset ring-rose-500/20 transition hover:bg-rose-500/20 active:scale-[0.98]"
          >
            <Lock size={16} /> Закрыть тикет
          </button>
        )}
        {!open && (
          <button
            onClick={() => store.reopen()}
            className="accent flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <LockOpen size={16} /> Переоткрыть тикет
          </button>
        )}
      </div>

      {/* Jira tasks */}
      <JiraSection store={store} ticket={t} onOpenBoard={onOpenBoard} />

      {/* Attachments gallery */}
      {photos.length > 0 && (
        <div className="border-t border-white/[0.06] p-4">
          <div className="label mb-2 text-[10px] text-slate-500">Фото ({photos.length})</div>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((m) => (
              <button
                key={m.id}
                onClick={() => setViewer({ url: mediaUrl(m.mediaFileId!), kind: 'image' })}
                className="aspect-square overflow-hidden rounded-lg ring-1 ring-white/10"
              >
                <img src={mediaUrl(m.mediaFileId!)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files (pdf / video / audio / docs) */}
      {files.length > 0 && (
        <div className="border-t border-white/[0.06] p-4">
          <div className="label mb-2 text-[10px] text-slate-500">Файлы ({files.length})</div>
          <div className="space-y-1.5">
            {files.map((m) => (
              <FileRow
                key={m.id}
                m={m}
                onOpenPdf={(url, name) => setViewer({ url, kind: 'pdf', name })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Customer history */}
      {store.history.length > 0 && (
        <div className="border-t border-white/[0.06] p-4">
          <div className="label mb-2 text-[10px] text-slate-500">Прошлые обращения ({store.history.length})</div>
          <div className="space-y-1">
            {store.history.map((h) => (
              <HistoryRow key={h.id} h={h} onOpen={() => store.selectTicket(h.id)} />
            ))}
          </div>
        </div>
      )}

      {viewer && (
        <Lightbox url={viewer.url} kind={viewer.kind} name={viewer.name} onClose={() => setViewer(null)} />
      )}
    </>
  );
}

function FileRow({ m, onOpenPdf }: { m: Message; onOpenPdf: (url: string, name?: string) => void }) {
  const name = m.fileName || undefined;
  const url = mediaUrl(m.mediaFileId!, name);
  const kind = mediaKind(m.mediaType, m.fileName);
  const meta =
    kind === 'pdf'
      ? { icon: <FileText size={15} />, tint: 'bg-rose-500/15 text-rose-300', label: 'PDF' }
      : kind === 'video'
        ? { icon: <Film size={15} />, tint: 'bg-sky-500/15 text-sky-300', label: 'Видео' }
        : kind === 'audio'
          ? { icon: <Music size={15} />, tint: 'bg-violet-500/15 text-violet-300', label: 'Аудио' }
          : { icon: <FileText size={15} />, tint: 'bg-white/[0.06] text-slate-300', label: 'Файл' };

  const content = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
        {meta.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-200">{name || meta.label}</span>
        <span className="label block text-[9px] text-slate-500">{meta.label}</span>
      </span>
    </>
  );

  if (kind === 'pdf') {
    return (
      <button
        onClick={() => onOpenPdf(url, name)}
        className="tile tile-hover flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition"
      >
        {content}
      </button>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="tile tile-hover flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition"
    >
      {content}
      <Download size={14} className="shrink-0 text-slate-500" />
    </a>
  );
}

function shortPriority(p: Priority): string {
  return { LOW: 'Низкий', NORMAL: 'Обычн.', HIGH: 'Высок.', URGENT: 'Срочно' }[p];
}

function JiraSection({
  store,
  ticket,
  onOpenBoard,
}: {
  store: ChatStore;
  ticket: Ticket;
  onOpenBoard?: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [comment, setComment] = useState('');
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasks = store.jiraTasks.filter((j) => j.ticketId === ticket.id);

  const reset = () => {
    setCreating(false);
    setComment('');
    setNotify(false);
    setError(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await store.createJira(ticket.id, comment.trim() || undefined, notify);
      reset();
    } catch (e) {
      setError((e as Error).message || 'Не удалось создать задачу');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-white/[0.06] p-4">
      <div className="label mb-2 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <SquareKanban size={11} /> Jira
        </span>
        {onOpenBoard && (
          <button
            onClick={onOpenBoard}
            className="flex items-center gap-1 text-[10px] font-medium text-indigo-300 transition hover:text-indigo-200"
          >
            Открыть доску <ExternalLink size={10} />
          </button>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mb-2 space-y-1">
          {tasks.map((j) => {
            const m = jiraStatusMeta(j.status);
            return (
              <div
                key={j.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-2.5 py-2"
              >
                <span className="font-mono text-[11px] font-semibold text-slate-300">{j.key}</span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${m.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  {m.short}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="tile tile-hover flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium text-slate-200 transition active:scale-[0.98]"
        >
          <SquareKanban size={15} /> Создать задачу в Jira
        </button>
      ) : (
        <div className="animate-scale-in space-y-2 rounded-2xl bg-white/[0.03] p-2.5">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Комментарий к задаче (что нужно сделать / детали проблемы)…"
            className="tile w-full resize-none rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
          />

          {/* Notify the customer? Off by default. */}
          <button
            type="button"
            onClick={() => setNotify((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.05]"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                notify ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.05] text-slate-500'
              }`}
            >
              {notify ? <Bell size={14} /> : <BellOff size={14} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-slate-200">Уведомить клиента</span>
              <span className="block text-[10px] leading-tight text-slate-500">
                {notify ? 'Клиент получит сообщение о заявке' : 'По умолчанию — без уведомления'}
              </span>
            </span>
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                notify ? 'bg-indigo-500' : 'bg-white/[0.12]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  notify ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={reset}
              disabled={busy}
              className="flex-1 rounded-xl bg-white/[0.05] py-2 text-[13px] font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="accent flex-1 rounded-xl py-2 text-[13px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? 'Создание…' : 'Создать'}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-500">
            Описание проблемы возьмётся из переписки автоматически.
          </p>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ h, onOpen }: { h: Ticket; onOpen: () => void }) {
  const badge = statusBadge(h);
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-slate-500">#{h.number}</span>
          <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
          <span className="text-[10px] text-slate-500">{badge.label}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-300">{h.subject || 'Без темы'}</span>
      </span>
      <span className="shrink-0 text-[10px] text-slate-500">
        {new Date(h.createdAt).toLocaleDateString('ru-RU')}
      </span>
    </button>
  );
}

function TagsEditor({ ticket, onChange }: { ticket: Ticket; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v || ticket.tags.includes(v) || ticket.tags.length >= 8) return;
    onChange([...ticket.tags, v]);
    setInput('');
  };
  return (
    <div>
      <div className="label mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
        <Tag size={11} /> Теги
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ticket.tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-[11px] text-slate-300"
          >
            {tag}
            <button onClick={() => onChange(ticket.tags.filter((x) => x !== tag))} className="text-slate-500 hover:text-rose-400">
              <X size={11} />
            </button>
          </span>
        ))}
        <span className="tile flex items-center rounded-full pl-2 pr-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="тег"
            className="w-16 bg-transparent py-1 text-[11px] text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <button onClick={add} className="text-slate-400 hover:text-slate-100">
            <Plus size={13} />
          </button>
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    if (!copy) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button
      type="button"
      onClick={doCopy}
      disabled={!copy}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition ${
        copy ? 'hover:bg-white/[0.04] active:bg-white/[0.06]' : 'cursor-default'
      }`}
    >
      <span className="label text-[10px] text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={`text-right text-[13px] font-medium text-slate-200 ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        {copy &&
          (copied ? (
            <Check size={13} className="text-emerald-400" />
          ) : (
            <Copy size={13} className="text-slate-600" />
          ))}
      </span>
    </button>
  );
}

function CopyText({ value, className = '' }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        })
      }
      className={`flex items-center gap-1 transition hover:text-slate-300 ${className}`}
    >
      {value}
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="opacity-50" />}
    </button>
  );
}
