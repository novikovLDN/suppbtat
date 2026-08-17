import { useEffect, useState } from 'react';
import { X, Settings, Bell, Drama, Smartphone, Check, Share, Volume2, AlertTriangle, Sun, Moon } from 'lucide-react';
import { api } from '../api';
import { OPERATOR_PERSONAS } from '../lib/personas';
import { isSoundOn, setSoundOn, playChime } from '../lib/sound';
import { getTheme, setTheme, type Theme } from '../lib/theme';
import {
  disablePush,
  enablePush,
  getActiveSubscription,
  isIOS,
  isStandalone,
  pushBlockedReason,
} from '../lib/push';

export function SettingsModal({
  onClose,
  persona,
  onPersonaChange,
  isAdmin = false,
}: {
  onClose: () => void;
  persona: string;
  onPersonaChange: (v: string) => void;
  isAdmin?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [sound, setSound] = useState(isSoundOn());
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [openCount, setOpenCount] = useState<number | null>(null);

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
  };

  const blocked = pushBlockedReason();
  const needsInstall = isIOS() && !isStandalone();

  useEffect(() => {
    getActiveSubscription()
      .then((s) => setEnabled(!!s))
      .finally(() => setChecked(true));
    if (isAdmin) api.getStats().then((s) => setOpenCount(s.open)).catch(() => {});
  }, [isAdmin]);

  const toggle = async () => {
    if (busy) return;
    setError('');
    setTestMsg('');
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        await enablePush();
        setEnabled(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить настройку');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestMsg('');
    setError('');
    try {
      const r = await api.pushTest();
      if (r.sent > 0) setTestMsg(`Отправлено на ${r.sent} устройств(о). Уведомление должно прийти в течение пары секунд.`);
      else if (r.failed > 0) setError(`Не доставлено. Причина: ${r.errors[0] || 'неизвестно'}`);
      else setError('Нет активной подписки на этом устройстве. Включите тумблер заново.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка теста');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm animate-overlay sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Settings size={16} /> Настройки
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {/* Appearance / theme */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Sun size={16} className="text-slate-400" /> Оформление
            </div>
            <p className="mt-1 text-xs text-slate-400">Светлая или тёмная тема панели.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                { key: 'light' as Theme, label: 'Светлая', icon: <Sun size={15} /> },
                { key: 'dark' as Theme, label: 'Тёмная', icon: <Moon size={15} /> },
              ]).map((o) => {
                const active = theme === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => chooseTheme(o.key)}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                      active
                        ? 'accent text-white'
                        : 'tile tile-hover text-slate-300'
                    }`}
                  >
                    {o.icon} {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operator persona */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Drama size={16} className="text-slate-400" /> Имя оператора для клиента
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Под этим именем клиент увидит, кто взял его чат в работу. «Случайно» — берётся
              случайное имя из набора.
            </p>
            <select
              value={persona}
              onChange={(e) => onPersonaChange(e.target.value)}
              className="tile mt-3 w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">🎲 Случайно</option>
              {OPERATOR_PERSONAS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Notifications toggle */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Bell size={16} className="text-slate-400" /> Push-уведомления
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Мгновенное уведомление на телефон при новом сообщении клиента.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={enabled}
                disabled={busy || !!blocked || !checked}
                onClick={toggle}
                className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
                  enabled ? 'accent' : 'bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                    enabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {needsInstall && (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/20">
                <Share size={14} className="mt-0.5 shrink-0" />
                <span>
                  На iPhone: откройте «Поделиться» → «На экран „Домой“», запустите приложение с
                  иконки — и включите уведомления уже там.
                </span>
              </div>
            )}
            {!needsInstall && blocked && (
              <div className="mt-3 rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-slate-400">
                {blocked}
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/20">
                {error}
              </div>
            )}
            {enabled && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <Check size={13} /> Включены на этом устройстве
                </span>
                <button
                  onClick={sendTest}
                  disabled={testing}
                  className="tile tile-hover flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-200 transition disabled:opacity-50"
                >
                  <Bell size={13} /> {testing ? 'Отправка…' : 'Тест'}
                </button>
              </div>
            )}
            {testMsg && <div className="mt-2 text-xs font-medium text-emerald-400">{testMsg}</div>}
          </div>

          {/* Sound */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Volume2 size={16} className="text-slate-400" /> Звук новых сообщений
                </div>
                <p className="mt-1 text-xs text-slate-400">Тихий сигнал при новом сообщении клиента.</p>
              </div>
              <button
                role="switch"
                aria-checked={sound}
                onClick={() => {
                  const next = !sound;
                  setSound(next);
                  setSoundOn(next);
                  if (next) playChime();
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${sound ? 'accent' : 'bg-white/15'}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                    sound ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Danger zone — admin only */}
          {isAdmin && <DangerZone openCount={openCount} />}

          {/* PWA hint */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-slate-400">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Smartphone size={16} className="text-slate-400" /> Установка приложения
            </div>
            Добавьте дашборд на экран «Домой» — он откроется как отдельное приложение на весь экран,
            без адресной строки.
            <div className="mt-2 text-slate-400">
              iOS: Safari → «Поделиться» → «На экран „Домой“». Android: меню → «Установить приложение».
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerZone({ openCount }: { openCount: number | null }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');
  const [err, setErr] = useState('');

  const reset = () => {
    setStep(0);
    setErr('');
  };

  const run = async () => {
    setRunning(true);
    setErr('');
    try {
      const r = await api.closeAll();
      setResult(`Закрываю ${r.started} тикетов (~20/сек). Список обновится автоматически.`);
      setStep(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
        <AlertTriangle size={16} /> Опасная зона
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Закрыть сразу все открытые тикеты{openCount != null ? ` (${openCount})` : ''}. Каждому клиенту
        уйдёт уведомление о закрытии; закрытие идёт по ~20 в секунду.
      </p>

      {result && <div className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{result}</div>}
      {err && <div className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</div>}

      {step === 0 && (
        <button
          onClick={() => setStep(1)}
          disabled={openCount === 0}
          className="mt-3 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-40"
        >
          Закрыть все тикеты
        </button>
      )}

      {step === 1 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-slate-300">
            Закрыть все {openCount ?? ''} открытых тикетов? Все клиенты получат уведомление.
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="tile tile-hover flex-1 rounded-xl py-2 text-xs font-medium text-slate-200 transition">
              Отмена
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
            >
              Продолжить
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-rose-300">Точно? Действие необратимо.</div>
          <div className="flex gap-2">
            <button onClick={reset} className="tile tile-hover flex-1 rounded-xl py-2 text-xs font-medium text-slate-200 transition">
              Отмена
            </button>
            <button
              onClick={run}
              disabled={running}
              className="flex-1 rounded-xl bg-rose-500 py-2 text-xs font-semibold text-white transition hover:bg-rose-400 active:scale-[0.98] disabled:opacity-50"
            >
              {running ? 'Запуск…' : 'Да, закрыть всё'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
