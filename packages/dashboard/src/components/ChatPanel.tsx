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
      <main className={`panel flex-1 items-center justify-center rounded-3xl ${className}`}>
        <div className="text-center text-slate-500">
          <div className="mb-3 text-5xl opacity-40">💬</div>
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
    <main className={`panel min-w-0 flex-1 flex-col overflow-hidden rounded-3xl ${className}`}>
      {/* Chat header */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/40 px-2 sm:px-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-white/50 active:scale-95 lg:hidden"
            title="Назад к списку"
          >
            ←
          </button>
        )}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm ring-1 ring-white/50 ${avatarColor(
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
          className="hidden shrink-0 items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-400/30 sm:flex"
          title={personaLocked ? 'Имя для клиента (закреплено)' : 'Имя для клиента при взятии в работу'}
        >
          🎭 <span className="max-w-[130px] truncate">{personaLabel}</span>
          {personaLocked && <span className="opacity-60">🔒</span>}
        </span>
        {onToggleInfo && (
          <button
            onClick={onToggleInfo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-white/50 active:scale-95 xl:hidden"
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
        <span className="glass rounded-full px-3 py-1 text-[11px] text-slate-600">{m.text}</span>
      </div>
    );
  }

  const fromOperator = m.sender === 'OPERATOR';
  return (
    <div className={`flex animate-fade-in ${fromOperator ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[72%] ${
          fromOperator
            ? 'accent rounded-br-md text-white'
            : 'rounded-bl-md border border-white/60 bg-white/80 text-slate-800 backdrop-blur'
        }`}
      >
        {fromOperator && m.operatorName && (
          <div className="mb-0.5 text-[10px] font-medium text-blue-50">
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
              fromOperator ? 'bg-white/20' : 'bg-slate-100'
            }`}
          >
            📎 {m.fileName || mediaLabel(m.mediaType)}
          </a>
        )}

        {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}

        <div
          className={`mt-0.5 text-right text-[10px] ${
            fromOperator ? 'text-blue-50/80' : 'text-slate-400'
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/40 px-4 py-3">
        <span className="text-xs text-slate-500">🔒 Тикет закрыт. Переоткройте, чтобы продолжить.</span>
        <button
          onClick={() => store.reopen()}
          className="glass glass-hover rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition active:scale-95"
        >
          Переоткрыть
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/40 px-3 py-3 sm:px-4">
      {file && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
          <span className="glass rounded-lg px-2 py-1">📎 {file.name}</span>
          <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-600">
            убрать
          </button>
        </div>
      )}
      {error && <div className="mb-2 text-xs text-rose-600">{error}</div>}
      <div className="flex items-end gap-2">
        <button
          onClick={() => setTemplatesOpen(true)}
          className="glass glass-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-slate-600 transition active:scale-95"
          title="Шаблоны ответов"
        >
          ⚡
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="glass glass-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-slate-600 transition active:scale-95"
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
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-white/60 bg-white/60 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-300 focus:bg-white/85 focus:ring-4 focus:ring-blue-500/10"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !file)}
          className="accent flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-white transition active:scale-95 disabled:opacity-40"
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
