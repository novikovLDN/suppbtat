import { useState } from 'react';
import { useAuth } from '../store';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2563eb] text-3xl text-white shadow-xl shadow-blue-500/30">
            🛡️
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Atlas Secure</h1>
          <p className="mt-1 text-sm text-slate-400">Панель поддержки</p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 rounded-3xl p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Логин</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              placeholder="operator"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-inset ring-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">Atlas Secure • Support Dashboard</p>
      </div>
    </div>
  );
}
