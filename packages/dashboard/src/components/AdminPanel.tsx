import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Operator } from '../types';
import { dateTime } from '../lib/format';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 className="text-sm font-semibold">⚙️ Управление операторами</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {/* Create form */}
          <form onSubmit={create} className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="col-span-2 text-xs font-medium text-slate-400">Новый оператор</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Логин"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Отображаемое имя"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Пароль (мин. 6)"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="OPERATOR">Оператор</option>
              <option value="ADMIN">Администратор</option>
            </select>
            <button
              type="submit"
              disabled={creating || !username || !displayName || password.length < 6}
              className="col-span-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating ? 'Создание…' : 'Создать оператора'}
            </button>
          </form>

          {error && <div className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}

          {/* List */}
          {loading ? (
            <div className="text-center text-sm text-slate-500">Загрузка…</div>
          ) : (
            <div className="space-y-2">
              {operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{op.displayName}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          op.role === 'ADMIN' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        {op.role === 'ADMIN' ? 'Админ' : 'Оператор'}
                      </span>
                      {!op.isActive && <span className="text-[10px] text-rose-400">отключён</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      @{op.username}
                      {op.lastSeenAt ? ` · был(а) ${dateTime(op.lastSeenAt)}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(op)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
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
