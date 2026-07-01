import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Info,
  Zap,
  Paperclip,
  Send,
  Lock,
  Drama,
  MessageSquare,
  FileText,
  X,
  StickyNote,
} from 'lucide-react';
import type { ChatStore } from '../useChatStore';
import type { Message, Template, Ticket } from '../types';
import { api, mediaUrl } from '../api';
import { avatarColor, customerName, initials, statusBadge, timeShort } from '../lib/format';
import { TemplatesModal } from './TemplatesModal';
import { Lightbox } from './Lightbox';

interface Props {
  store: ChatStore;
  operatorId: number;
  persona: string;
  className?: string;
  onBack?: () => void;
  onToggleInfo?: () => void;
}

export function applyVars(text: string, ticket: Ticket | null): string {
  if (!ticket) return text;
  const name = ticket.customer.firstName || ticket.customer.username || 'клиент';
  return text
    .replace(/\{имя\}/gi, name)
    .replace(/\{номер\}/gi, `#${ticket.number}`)
    .replace(/\{username\}/gi, ticket.customer.username ? `@${ticket.customer.username}` : '');
}

export function ChatPanel({ store, operatorId, persona, className = '', onBack, onToggleInfo }: Props) {
  const { selected, messages } = store;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, selected?.id]);

  if (!selected) {
    return (
      <main className={`panel flex-1 items-center justify-center rounded-[26px] ${className}`}>
        <div className="flex flex-col items-center text-slate-600">
          <MessageSquare size={44} strokeWidth={1.25} className="mb-3 opacity-40" />
          <div className="text-sm">Выберите тикет, чтобы начать переписку</div>
        </div>
      </main>
    );
  }

  const badge = statusBadge(selected);
  const closed = selected.status === 'CLOSED';
  const personaLabel = selected.assignedName || persona || 'Случайно';
  const personaLocked = !!selected.assignedName;

  return (
    <main className={`panel min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] ${className}`}>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] px-2 sm:px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/[0.06] active:scale-95 lg:hidden"
            title="Назад к списку"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(
            selected.customer.id,
          )}`}
        >
          {initials(selected.customer)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white">
              {customerName(selected.customer)}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>
          <div className="truncate text-[11px] text-slate-500">
            <span className="font-mono">#{selected.number}</span>
            {selected.assignedOperatorName ? ` · ${selected.assignedOperatorName}` : ' · не назначен'}
          </div>
        </div>
        <span
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-medium text-indigo-300 ring-1 ring-inset ring-indigo-400/20 sm:flex"
          title={personaLocked ? 'Имя для клиента (закреплено)' : 'Имя для клиента при взятии в работу'}
        >
          <Drama size={12} />
          <span className="max-w-[130px] truncate">{personaLabel}</span>
          {personaLocked && <Lock size={10} className="opacity-70" />}
        </span>
        {onToggleInfo && (
          <button
            onClick={onToggleInfo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/[0.06] active:scale-95 xl:hidden"
            title="Информация"
          >
            <Info size={18} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-4 sm:px-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} mine={m.operatorId === operatorId} onOpenImage={setLightbox} />
        ))}
      </div>

      <Composer store={store} disabled={closed} />

      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </main>
  );
}

function MessageBubble({
  m,
  mine,
  onOpenImage,
}: {
  m: Message;
  mine: boolean;
  onOpenImage: (url: string) => void;
}) {
  if (m.sender === 'SYSTEM') {
    return (
      <div className="flex animate-fade-in justify-center py-1">
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-400 ring-1 ring-inset ring-white/[0.06]">
          {m.text}
        </span>
      </div>
    );
  }

  // Internal note — operators only, distinct amber card.
  if (m.internal) {
    return (
      <div className="flex animate-fade-in justify-end">
        <div className="max-w-[82%] rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-sm text-amber-100 sm:max-w-[72%]">
          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-amber-300/90">
            <StickyNote size={11} /> Заметка{m.operatorName ? ` · ${m.operatorName}` : ''}
          </div>
          {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
          <div className="mt-0.5 text-right text-[10px] text-amber-300/60">{timeShort(m.createdAt)}</div>
        </div>
      </div>
    );
  }

  const fromOperator = m.sender === 'OPERATOR';
  return (
    <div className={`flex animate-fade-in ${fromOperator ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[72%] ${
          fromOperator
            ? 'accent rounded-br-md text-white'
            : 'rounded-bl-md border border-white/[0.07] bg-white/[0.05] text-slate-100'
        }`}
      >
        {fromOperator && m.operatorName && (
          <div className="mb-0.5 text-[10px] font-medium text-white/70">{mine ? 'Вы' : m.operatorName}</div>
        )}
        {m.mediaType === 'photo' && m.mediaFileId && (
          <button onClick={() => onOpenImage(mediaUrl(m.mediaFileId!))} className="block">
            <img
              src={mediaUrl(m.mediaFileId)}
              alt="вложение"
              className="mb-1 max-h-64 cursor-zoom-in rounded-xl object-cover"
              loading="lazy"
            />
          </button>
        )}
        {m.mediaType && m.mediaType !== 'photo' && m.mediaFileId && (
          <a
            href={mediaUrl(m.mediaFileId)}
            target="_blank"
            rel="noreferrer"
            className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
              fromOperator ? 'bg-black/20' : 'bg-white/10'
            }`}
          >
            <FileText size={14} />
            {m.fileName || mediaLabel(m.mediaType)}
          </a>
        )}
        {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
        <div className={`mt-0.5 text-right text-[10px] ${fromOperator ? 'text-white/60' : 'text-slate-500'}`}>
          {timeShort(m.createdAt)}
        </div>
      </div>
    </div>
  );
}

function mediaLabel(type: string): string {
  switch (type) {
    case 'video':
      return 'Видео';
    case 'voice':
      return 'Голосовое сообщение';
    case 'document':
      return 'Файл';
    default:
      return 'Вложение';
  }
}

function Composer({ store, disabled }: { store: ChatStore; disabled: boolean }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const loadTemplates = () => api.listTemplates().then((r) => setTemplates(r.templates)).catch(() => {});
  useEffect(() => {
    loadTemplates();
  }, []);

  const insert = (tpl: Template) => {
    const applied = applyVars(tpl.text, store.selected);
    setText((prev) => (prev.trim() && !prev.trim().startsWith('/') ? `${prev}\n${applied}` : applied));
    api.useTemplate(tpl.id).catch(() => {});
    setTimeout(() => textRef.current?.focus(), 30);
  };

  // slash-command matches
  const slash = text.trim().startsWith('/') && !text.includes('\n') ? text.trim().slice(1).toLowerCase() : null;
  const slashMatches =
    slash !== null
      ? templates.filter((t) => t.name.toLowerCase().includes(slash) || (t.category ?? '').toLowerCase().includes(slash)).slice(0, 6)
      : [];
  const chips = templates.filter((t) => t.pinned).slice(0, 6);

  const send = async () => {
    if (sending) return;
    if (!text.trim() && !file) return;
    setSending(true);
    setError('');
    try {
      await store.sendMessage(text.trim(), note ? null : file, note);
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  if (disabled) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lock size={13} /> Тикет закрыт. Переоткройте, чтобы продолжить.
        </span>
        <button
          onClick={() => store.reopen()}
          className="tile tile-hover rounded-full px-3 py-1.5 text-xs font-medium text-slate-200 transition active:scale-95"
        >
          Переоткрыть
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 border-t border-white/[0.06] px-3 py-3 sm:px-4">
      {/* slash-command popover */}
      {slashMatches.length > 0 && (
        <div className="panel absolute bottom-full left-3 right-3 z-10 mb-2 max-h-56 overflow-y-auto rounded-2xl p-1.5">
          {slashMatches.map((t) => (
            <button
              key={t.id}
              onClick={() => insert(t)}
              className="flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/[0.06]"
            >
              <Zap size={13} className="mt-0.5 shrink-0 text-indigo-300" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-100">{t.name}</span>
                <span className="block truncate text-[11px] text-slate-500">{t.text}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* pinned quick-reply chips */}
      {!note && chips.length > 0 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {chips.map((t) => (
            <button
              key={t.id}
              onClick={() => insert(t)}
              className="tile tile-hover flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-300 transition"
              title={t.text}
            >
              <Zap size={11} className="text-indigo-300" /> {t.name}
            </button>
          ))}
        </div>
      )}

      {file && !note && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="tile flex items-center gap-1.5 rounded-lg px-2 py-1">
            <Paperclip size={12} /> {file.name}
          </span>
          <button onClick={() => setFile(null)} className="text-slate-500 hover:text-rose-400">
            <X size={14} />
          </button>
        </div>
      )}
      {error && <div className="mb-2 text-xs text-rose-400">{error}</div>}

      <div className="flex items-end gap-2">
        <button
          onClick={() => setNote((v) => !v)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
            note ? 'bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-500/30' : 'tile tile-hover text-slate-300'
          }`}
          title="Внутренняя заметка (не видит клиент)"
        >
          <StickyNote size={18} />
        </button>
        <button
          onClick={() => setTemplatesOpen(true)}
          className="tile tile-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95"
          title="Шаблоны ответов"
        >
          <Zap size={18} />
        </button>
        {!note && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="tile tile-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-300 transition active:scale-95"
              title="Прикрепить фото или файл"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.txt,.log,.zip"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </>
        )}
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (slashMatches.length > 0) insert(slashMatches[0]);
              else send();
            }
          }}
          rows={1}
          placeholder={note ? 'Внутренняя заметка…' : 'Сообщение клиенту…  (/ — шаблон)'}
          className={`max-h-32 min-h-11 flex-1 resize-none rounded-2xl px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:ring-4 ${
            note
              ? 'border border-amber-500/30 bg-amber-500/[0.06] focus:border-amber-400/50 focus:ring-amber-500/10'
              : 'tile focus:border-indigo-400/40 focus:ring-indigo-500/10'
          }`}
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !file)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-40 sm:w-auto sm:px-4 ${
            note ? 'bg-amber-500 hover:bg-amber-400' : 'accent'
          }`}
        >
          <span className="hidden sm:inline">{sending ? '…' : note ? 'Заметка' : 'Отправить'}</span>
          <Send size={18} className="sm:hidden" />
        </button>
      </div>

      {templatesOpen && (
        <TemplatesModal
          onClose={() => {
            setTemplatesOpen(false);
            loadTemplates();
          }}
          onPick={(txt) => {
            const applied = applyVars(txt, store.selected);
            setText((prev) => (prev.trim() && !prev.trim().startsWith('/') ? `${prev}\n${applied}` : applied));
            setTemplatesOpen(false);
            setTimeout(() => textRef.current?.focus(), 30);
          }}
        />
      )}
    </div>
  );
}
