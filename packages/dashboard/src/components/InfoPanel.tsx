import { useState } from 'react';
import { X, UserCheck, Undo2, Lock, LockOpen, Copy, Check } from 'lucide-react';
import type { ChatStore } from '../useChatStore';
import { avatarColor, customerName, dateTime, initials, statusBadge } from '../lib/format';

interface Props {
  store: ChatStore;
  variant: 'column' | 'drawer';
  persona: string;
  onClose?: () => void;
}

export function InfoPanel({ store, variant, persona, onClose }: Props) {
  const t = store.selected;

  if (variant === 'column') {
    return (
      <aside className="panel hidden w-[300px] shrink-0 flex-col overflow-y-auto rounded-[26px] xl:flex">
        {t ? <Body store={store} persona={persona} /> : null}
      </aside>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end xl:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <aside
        className="panel animate-slide-in-right relative flex h-full w-[88%] max-w-sm flex-col overflow-y-auto rounded-none" style={{ paddingTop: "env(safe-area-inset-top)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="tile absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition active:scale-95"
        >
          <X size={16} />
        </button>
        {t ? <Body store={store} persona={persona} /> : null}
      </aside>
    </div>
  );
}

function Body({ store, persona }: { store: ChatStore; persona: string }) {
  const t = store.selected!;
  const badge = statusBadge(t);
  const open = t.status === 'OPEN';
  const assigned = t.assignedOperatorId !== null;

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
        <div className="mt-3 font-semibold text-white">{customerName(t.customer)}</div>
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

      <div className="space-y-1 border-b border-white/[0.06] p-3">
        <Row label="Тикет" value={`#${t.number}`} mono copy />
        <Row label="Telegram ID" value={t.customer.id} mono copy />
        {t.customer.username && <Row label="Username" value={`@${t.customer.username}`} copy />}
        <Row label="Создан" value={dateTime(t.createdAt)} />
        <Row label="Активность" value={dateTime(t.lastMessageAt)} />
        <Row label="Оператор" value={t.assignedOperatorName || 'не назначен'} />
        <Row label="Имя для клиента" value={t.assignedName || '—'} />
        {t.closedAt && <Row label="Закрыт" value={dateTime(t.closedAt)} />}
      </div>

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
              <br />
              (изменить — в Настройках)
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
    </>
  );
}

/** A label/value row. When `copy`, one tap copies the value to the clipboard. */
function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  const [copied, setCopied] = useState(false);

  const doCopy = () => {
    if (!copy) return;
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
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

/** Tap-to-copy inline text (used for @username under the name). */
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
