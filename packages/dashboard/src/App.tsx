import { useAuth } from './store';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';

export function App() {
  const { operator, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <div className="animate-pulse text-sm">Загрузка…</div>
      </div>
    );
  }

  return operator ? <Dashboard /> : <LoginPage />;
}
