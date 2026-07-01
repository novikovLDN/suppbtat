import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Operator } from '../types';
import { dateTime } from '../lib/format';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [creating, setCreating] = useState(false);

  const load = () => {
    api
      .listOperators()
      .then((r) => setOperators(r.operators))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.createOperator({ username: username.trim(), displayName: displayName.trim(), password, role });
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('OPERATOR');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (op: Operator) => {
    await api.updateOperator(op.id, { isActive: !op.isActive });
    load();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">👥 Управление операторами</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <form
            onSubmit={create}
            className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2"
          >
            <div className="text-xs font-semibold text-slate-500 sm:col-span-2">Новый оператор</div>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Логин" className={inputCls} />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Отображаемое имя"
              className={inputCls}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Пароль (мин. 6)"
              className={inputCls}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              <option value="OPERATOR">Оператор</option>
              <option value="ADMIN">Администратор</option>
            </select>
            <button
              type="submit"
              disabled={creating || !username || !displayName || password.length < 6}
              className="rounded-xl bg-[#2563eb] py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none sm:col-span-2"
            >
              {creating ? 'Создание…' : 'Создать оператора'}
            </button>
          </form>

          {error && (
            <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-inset ring-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-sm text-slate-400">Загрузка…</div>
          ) : (
            <div className="space-y-2">
              {operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="truncate font-semibold text-slate-800">{op.displayName}</span>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          op.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {op.role === 'ADMIN' ? 'Админ' : 'Оператор'}
                      </span>
                      {!op.isActive && <span className="shrink-0 text-[10px] text-rose-500">отключён</span>}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      @{op.username}
                      {op.lastSeenAt ? ` · был(а) ${dateTime(op.lastSeenAt)}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(op)}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 active:scale-95"
                  >
                    {op.isActive ? 'Отключить' : 'Включить'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
