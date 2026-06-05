import { useEffect, useRef, useState } from 'react';
import type { ChatStore } from '../useChatStore';
import type { Message } from '../types';
import { mediaUrl } from '../api';
import { customerName, statusBadge, timeShort } from '../lib/format';

export function ChatPanel({ store, operatorId }: { store: ChatStore; operatorId: number }) {
  const { selected, messages } = store;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, selected?.id]);

  if (!selected) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-950">
        <div className="text-center text-slate-600">
          <div className="mb-3 text-4xl">💬</div>
          <div className="text-sm">Выберите тикет, чтобы начать переписку</div>
        </div>
      </main>
    );
  }

  const badge = statusBadge(selected);
  const closed = selected.status === 'CLOSED';

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-slate-950">
      {/* Chat header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{customerName(selected.customer)}</span>
            <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${badge.className}`}>
              <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Тикет #{selected.number}
            {selected.assignedOperatorName ? ` · ${selected.assignedOperatorName}` : ' · не назначен'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} mine={m.operatorId === operatorId} />
        ))}
      </div>

      {/* Composer */}
      <Composer store={store} disabled={closed} />
    </main>
  );
}

function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  if (m.sender === 'SYSTEM') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-slate-800/70 px-3 py-1 text-[11px] text-slate-400">{m.text}</span>
      </div>
    );
  }

  const fromOperator = m.sender === 'OPERATOR';
  return (
    <div className={`flex ${fromOperator ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm ${
          fromOperator
            ? 'rounded-br-sm bg-indigo-600 text-white'
            : 'rounded-bl-sm bg-slate-800 text-slate-100'
        }`}
      >
        {fromOperator && m.operatorName && (
          <div className="mb-0.5 text-[10px] font-medium text-indigo-200">{mine ? 'Вы' : m.operatorName}</div>
        )}

        {m.mediaType === 'photo' && m.mediaFileId && (
          <a href={mediaUrl(m.mediaFileId)} target="_blank" rel="noreferrer">
            <img
              src={mediaUrl(m.mediaFileId)}
              alt="вложение"
              className="mb-1 max-h-64 rounded-lg object-cover"
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

        <div className={`mt-0.5 text-right text-[10px] ${fromOperator ? 'text-indigo-200/70' : 'text-slate-500'}`}>
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
  const fileRef = useRef<HTMLInputElement>(null);

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
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/60 px-4 py-3">
        <span className="text-xs text-slate-500">🔒 Тикет закрыт. Переоткройте, чтобы продолжить переписку.</span>
        <button
          onClick={() => store.reopen()}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Переоткрыть
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900/60 px-4 py-3">
      {file && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-800 px-2 py-1">📎 {file.name}</span>
          <button onClick={() => setFile(null)} className="text-slate-500 hover:text-rose-300">
            убрать
          </button>
        </div>
      )}
      {error && <div className="mb-2 text-xs text-rose-300">{error}</div>}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-lg text-slate-400 hover:bg-slate-800"
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Сообщение клиенту…  (Enter — отправить, Shift+Enter — перенос)"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !file)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {sending ? '…' : 'Отправить'}
        </button>
      </div>
    </div>
  );
}
