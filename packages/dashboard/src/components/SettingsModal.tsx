import { useEffect, useState } from 'react';
import { api } from '../api';
import { OPERATOR_PERSONAS } from '../lib/personas';
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
}: {
  onClose: () => void;
  persona: string;
  onPersonaChange: (v: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);

  const blocked = pushBlockedReason();
  const needsInstall = isIOS() && !isStandalone();

  useEffect(() => {
    getActiveSubscription()
      .then((s) => setEnabled(!!s))
      .finally(() => setChecked(true));
  }, []);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">⚙️ Настройки</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-5">
          {/* Operator persona */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              🎭 Имя оператора для клиента
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Под этим именем клиент увидит, кто взял его чат в работу. «Случайно» — берётся
              случайное имя из набора.
            </p>
            <select
              value={persona}
              onChange={(e) => onPersonaChange(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
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
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  🔔 Push-уведомления
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
                  enabled ? 'bg-[#2563eb]' : 'bg-slate-300'
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
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
                📲 На iPhone: откройте «Поделиться» → «На экран „Домой“», запустите приложение с
                иконки — и включите уведомления уже там.
              </div>
            )}
            {!needsInstall && blocked && (
              <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                {blocked}
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 ring-1 ring-inset ring-rose-100">
                {error}
              </div>
            )}
            {enabled && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-emerald-600">✓ Включены на этом устройстве</span>
                <button
                  onClick={sendTest}
                  disabled={testing}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  {testing ? 'Отправка…' : '🔔 Тест уведомления'}
                </button>
              </div>
            )}
            {testMsg && <div className="mt-2 text-xs font-medium text-emerald-600">{testMsg}</div>}
          </div>

          {/* PWA hint */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-400">
            <div className="mb-1 text-sm font-semibold text-slate-800">📱 Установка приложения</div>
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
