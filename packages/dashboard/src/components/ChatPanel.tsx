import { useEffect, useRef, useState } from 'react';
import type { ChatStore } from '../useChatStore';
import type { Message } from '../types';
import { mediaUrl } from '../api';
import { avatarColor, customerName, initials, statusBadge, timeShort } from '../lib/format';
import { TemplatesModal } from './TemplatesModal';

interface Props {
  store: ChatStore;
  operatorId: number;
  persona: string;
  className?: string;
  onBack?: () => void;
  onToggleInfo?: () => void;
}

export function ChatPanel({ store, operatorId, persona, className = '', onBack, onToggleInfo }: Props) {
  const { selected, messages } = store;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, selected?.id]);

  if (!selected) {
    return (
      <main className={`panel flex-1 items-center justify-center rounded-2xl ${className}`}>
        <div className="text-center text-slate-400">
          <div className="mb-3 text-5xl opacity-40">💬</div>
          <div className="text-sm">Выберите тикет, чтобы начать переписку</div>
        </div>
      </main>
    );
  }

  const badge = statusBadge(selected);
  const closed = selected.status === 'CLOSED';
  // Name the customer sees: locked persona once claimed, else the chosen default.
  const personaLabel = selected.assignedName || persona || 'Случайно';
  const personaLocked = !!selected.assignedName;

  return (
    <main className={`panel min-w-0 flex-1 flex-col overflow-hidden rounded-2xl ${className}`}>
      {/* Chat header */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-2 sm:px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 lg:hidden"
            title="Назад к списку"
          >
            ←
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
            <span className="truncate text-sm font-semibold text-slate-900">
              {customerName(selected.customer)}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>
          <div className="truncate text-[11px] text-slate-400">
            <span className="font-mono">#{selected.number}</span>
            {selected.assignedOperatorName ? ` · ${selected.assignedOperatorName}` : ' · не назначен'}
          </div>
        </div>
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 ring-1 ring-inset ring-blue-100 sm:flex"
          title={personaLocked ? 'Имя для клиента (закреплено)' : 'Имя для клиента при взятии в работу'}
        >
          🎭 <span className="max-w-[130px] truncate">{personaLabel}</span>
          {personaLocked && <span className="opacity-60">🔒</span>}
        </span>
        {onToggleInfo && (
          <button
            onClick={onToggleInfo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 xl:hidden"
            title="Информация"
          >
            ⓘ
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-5"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} mine={m.operatorId === operatorId} />
        ))}
      </div>

      <Composer store={store} disabled={closed} />
    </main>
  );
}

function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  if (m.sender === 'SYSTEM') {
    return (
      <div className="flex animate-fade-in justify-center py-1">
        <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] text-slate-500">
          {m.text}
        </span>
      </div>
    );
  }

  const fromOperator = m.sender === 'OPERATOR';
  return (
    <div className={`flex animate-fade-in ${fromOperator ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[72%] ${
          fromOperator
            ? 'rounded-br-md bg-[#2563eb] text-white shadow-blue-500/20'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
        }`}
      >
        {fromOperator && m.operatorName && (
          <div className="mb-0.5 text-[10px] font-medium text-blue-100">
            {mine ? 'Вы' : m.operatorName}
          </div>
        )}

        {m.mediaType === 'photo' && m.mediaFileId && (
          <a href={mediaUrl(m.mediaFileId)} target="_blank" rel="noreferrer">
            <img
              src={mediaUrl(m.mediaFileId)}
              alt="вложение"
              className="mb-1 max-h-64 rounded-xl object-cover"
              loading="lazy"
            />
          </a>
        )}
        {m.mediaType && m.mediaType !== 'photo' && m.mediaFileId && (
          <a
            href={mediaUrl(m.mediaFileId)}
            target="_blank"
            rel="noreferrer"
            className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs underline ${
              fromOperator ? 'bg-white/15' : 'bg-slate-100'
            }`}
          >
            📎 {m.fileName || mediaLabel(m.mediaType)}
          </a>
        )}

        {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}

        <div
          className={`mt-0.5 text-right text-[10px] ${
            fromOperator ? 'text-blue-100/70' : 'text-slate-400'
          }`}
        >
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const insertTemplate = (tpl: string) => {
    setText((prev) => (prev.trim() ? `${prev}\n${tpl}` : tpl));
    setTemplatesOpen(false);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const send = async () => {
    if (sending) return;
    if (!text.trim() && !file) return;
    setSending(true);
    setError('');
    try {
      await store.sendMessage(text.trim(), file);
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
        <span className="text-xs text-slate-400">🔒 Тикет закрыт. Переоткройте, чтобы продолжить.</span>
        <button
          onClick={() => store.reopen()}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 active:scale-95"
        >
          Переоткрыть
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
      {file && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-lg bg-slate-100 px-2 py-1">📎 {file.name}</span>
          <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500">
            убрать
          </button>
        </div>
      )}
      {error && <div className="mb-2 text-xs text-rose-500">{error}</div>}
      <div className="flex items-end gap-2">
        <button
          onClick={() => setTemplatesOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-500 transition hover:bg-slate-100 active:scale-95"
          title="Шаблоны ответов"
        >
          ⚡
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-500 transition hover:bg-slate-100 active:scale-95"
          title="Прикрепить фото или файл"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.txt,.log,.zip"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Сообщение клиенту…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !file)}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#2563eb] px-4 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8] active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {sending ? '…' : <span className="hidden sm:inline">Отправить</span>}
          <span className={sending ? 'hidden' : 'sm:hidden'}>➤</span>
        </button>
      </div>

      {templatesOpen && (
        <TemplatesModal onClose={() => setTemplatesOpen(false)} onPick={insertTemplate} />
      )}
    </div>
  );
}
