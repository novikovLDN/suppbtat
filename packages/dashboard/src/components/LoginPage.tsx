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

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl">
            🛡️
          </div>
          <h1 className="text-xl font-semibold text-white">Atlas Secure</h1>
          <p className="mt-1 text-sm text-slate-400">Панель поддержки</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Логин</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="operator"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-600">Atlas Secure • Support Dashboard</p>
      </div>
    </div>
  );
}
