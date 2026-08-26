import { useState } from 'react';
import { X, UserCheck, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import type { Ticket } from '../types';
import { OPERATOR_ROLES, OPERATOR_NAMES, composePersona } from '../lib/personas';
import { customerName } from '../lib/format';

interface Props {
  ticket: Ticket;
  onConfirm: (persona: string) => Promise<void> | void;
  onClose: () => void;
}

export function ClaimFlow({ ticket, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persona = role && name ? composePersona(role, name) : '';

  const confirm = async () => {
    if (!persona) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(persona);
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Не удалось взять чат в работу');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm animate-overlay sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[86dvh] sm:max-w-md sm:rounded-3xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <UserCheck size={16} /> Взять чат в работу
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              #{ticket.number} · {customerName(ticket.customer)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex shrink-0 items-center gap-2 px-5 pt-3">
          <StepDot active={step >= 1} label="Роль" done={step > 1} />
          <span className="h-px flex-1 bg-white/[0.08]" />
          <StepDot active={step >= 2} label="Имя" />
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <>
              <div className="label mb-2 text-[10px] text-slate-500">Шаг 1 · Выберите роль</div>
              <div className="grid grid-cols-2 gap-2">
                {OPERATOR_ROLES.map((r) => (
                  <Chip key={r} active={role === r} onClick={() => setRole(r)}>
                    {r}
                  </Chip>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="label mb-2 text-[10px] text-slate-500">Шаг 2 · Выберите имя</div>
              <div className="grid grid-cols-3 gap-2">
                {OPERATOR_NAMES.map((n) => (
                  <Chip key={n} active={name === n} onClick={() => setName(n)}>
                    {n}
                  </Chip>
                ))}
              </div>
              {persona && (
                <p className="mt-4 text-center text-[12px] text-slate-400">
                  Клиент увидит: <span className="font-semibold text-indigo-300">{persona}</span>
                </p>
              )}
            </>
          )}
          {error && <p className="mt-3 text-center text-[12px] text-rose-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2 border-t border-white/[0.06] p-4">
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!role}
              className="accent flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              Дальше <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={busy}
                className="tile tile-hover flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-slate-200 transition active:scale-[0.98] disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Назад
              </button>
              <button
                onClick={confirm}
                disabled={!name || busy}
                className="accent flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                {busy ? 'Берём…' : (<><Check size={16} /> Готово</>)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, label, done }: { active: boolean; label: string; done?: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-medium ${active ? 'text-slate-200' : 'text-slate-500'}`}>
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
          active ? 'accent text-white' : 'tile text-slate-500'
        }`}
      >
        {done ? <Check size={11} /> : label === 'Роль' ? '1' : '2'}
      </span>
      {label}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-center text-[12px] font-medium leading-tight transition active:scale-[0.98] ${
        active
          ? 'accent text-white ring-2 ring-indigo-400/40'
          : 'tile tile-hover text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
