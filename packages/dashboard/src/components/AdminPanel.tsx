import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Operator } from '../types';
import { dateTime } from '../lib/format';

const inputCls =
  'w-full rounded-xl border border-white/60 bg-white/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-300 focus:bg-white/85 focus:ring-4 focus:ring-blue-500/10';

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/25 pb-safe backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel-solid animate-slide-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/40 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">👥 Управление операторами</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/50"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <form
            onSubmit={create}
            className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-white/50 bg-white/40 p-4 sm:grid-cols-2"
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
              className="accent rounded-xl py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none sm:col-span-2"
            >
              {creating ? 'Создание…' : 'Создать оператора'}
            </button>
          </form>

          {error && (
            <div className="mb-3 rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-300/40">
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
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/40 px-4 py-3"
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
                    className="glass glass-hover shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition active:scale-95"
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
