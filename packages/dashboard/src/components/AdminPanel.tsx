import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Operator } from '../types';
import { dateTime } from '../lib/format';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20';

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
        className="glass animate-slide-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 shadow-2xl sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <h2 className="text-sm font-semibold">⚙️ Управление операторами</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <form
            onSubmit={create}
            className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2"
          >
            <div className="text-xs font-medium text-slate-400 sm:col-span-2">Новый оператор</div>
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
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none sm:col-span-2"
            >
              {creating ? 'Создание…' : 'Создать оператора'}
            </button>
          </form>

          {error && (
            <div className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/20">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-sm text-slate-500">Загрузка…</div>
          ) : (
            <div className="space-y-2">
              {operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="truncate font-medium">{op.displayName}</span>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${
                          op.role === 'ADMIN'
                            ? 'bg-violet-500/20 text-violet-300'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {op.role === 'ADMIN' ? 'Админ' : 'Оператор'}
                      </span>
                      {!op.isActive && <span className="shrink-0 text-[10px] text-rose-400">отключён</span>}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      @{op.username}
                      {op.lastSeenAt ? ` · был(а) ${dateTime(op.lastSeenAt)}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(op)}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 active:scale-95"
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
