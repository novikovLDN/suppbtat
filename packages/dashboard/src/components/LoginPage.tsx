import { useState } from 'react';
import { Shield } from 'lucide-react';
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
    'tile w-full rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10';

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="accent mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] text-white">
            <Shield size={30} strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Atlas Secure</h1>
          <p className="label mt-1.5 text-[10px] text-slate-500">Панель поддержки</p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 rounded-[26px] p-6">
          <div>
            <label className="label mb-2 block text-[10px] text-slate-500">Логин</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              placeholder="operator"
            />
          </div>
          <div>
            <label className="label mb-2 block text-[10px] text-slate-500">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="accent w-full rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-600">Atlas Secure • Support Dashboard</p>
      </div>
    </div>
  );
}
