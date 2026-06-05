import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import type { Operator } from './types';

interface AuthState {
  operator: Operator | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // One-tap admin login: /admin in the bot links here with ?login=<token>.
    const params = new URLSearchParams(location.search);
    const loginToken = params.get('login');
    if (loginToken) {
      setToken(loginToken);
      params.delete('login');
      const clean = location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', clean);
    }

    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((r) => setOperator(r.operator))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const r = await api.login(username, password);
    setToken(r.token);
    setOperator(r.operator);
  };

  const logout = () => {
    clearToken();
    setOperator(null);
  };

  return <AuthContext.Provider value={{ operator, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
