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
      <main className={`flex-1 items-center justify-center ${className}`}>
        <div className="text-center text-slate-600">
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
    <main className={`min-w-0 flex-1 flex-col ${className}`}>
      {/* Chat header */}
      <div className="glass flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-2 sm:px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 active:scale-95 lg:hidden"
            title="Назад к списку"
          >
            ←
          </button>
        )}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-white/10 ${avatarColor(
            selected.customer.id,
          )}`}
        >
          {initials(selected.customer)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{customerName(selected.customer)}</span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${badge.className}`}
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
          className="flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2 py-1 text-[11px] text-violet-200 ring-1 ring-inset ring-violet-400/25"
          title={personaLocked ? 'Имя для клиента (закреплено)' : 'Имя для клиента при взятии в работу'}
        >
          🎭 <span className="max-w-[120px] truncate">{personaLabel}</span>
          {personaLocked && <span className="opacity-60">🔒</span>}
        </span>
        {onToggleInfo && (
          <button
            onClick={onToggleInfo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 active:scale-95 xl:hidden"
            title="Информация"
          >
            ⓘ
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-4 sm:px-5">
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
        <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-inset ring-white/5">
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
            ? 'rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20'
            : 'rounded-bl-md bg-white/[0.07] text-slate-100 ring-1 ring-inset ring-white/5'
        }`}
      >
        {fromOperator && m.operatorName && (
          <div className="mb-0.5 text-[10px] font-medium text-indigo-100/80">
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
            className="mb-1 flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5 text-xs underline"
          >
            📎 {m.fileName || mediaLabel(m.mediaType)}
          </a>
        )}

        {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}

        <div
          className={`mt-0.5 text-right text-[10px] ${
            fromOperator ? 'text-indigo-100/60' : 'text-slate-500'
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
      <div className="glass flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/5 px-4 py-3">
        <span className="text-xs text-slate-500">🔒 Тикет закрыт. Переоткройте, чтобы продолжить.</span>
        <button
          onClick={() => store.reopen()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 active:scale-95"
        >
          Переоткрыть
        </button>
      </div>
    );
  }

  return (
    <div className="glass shrink-0 border-t border-white/5 px-3 py-3 sm:px-4">
      {file && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded-lg bg-white/5 px-2 py-1 ring-1 ring-inset ring-white/5">📎 {file.name}</span>
          <button onClick={() => setFile(null)} className="text-slate-500 hover:text-rose-300">
            убрать
          </button>
        </div>
      )}
      {error && <div className="mb-2 text-xs text-rose-300">{error}</div>}
      <div className="flex items-end gap-2">
        <button
          onClick={() => setTemplatesOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-slate-300 transition hover:bg-white/10 active:scale-95"
          title="Шаблоны ответов"
        >
          ⚡
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-slate-300 transition hover:bg-white/10 active:scale-95"
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
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !file)}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-violet-500 active:scale-95 disabled:opacity-40 disabled:shadow-none"
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
