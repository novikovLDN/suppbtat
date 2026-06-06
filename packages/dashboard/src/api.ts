import type { Counts, Message, Operator, Scope, Template, Ticket } from './types';

const TOKEN_KEY = 'atlas_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, 'Сессия истекла');
  }
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; operator: Operator }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ operator: Operator | null }>('/api/auth/me'),

  listTickets: (scope: Scope, search?: string, cursor?: number) => {
    const params = new URLSearchParams({ scope });
    if (search) params.set('search', search);
    if (cursor) params.set('cursor', String(cursor));
    return request<{ tickets: Ticket[]; nextCursor: number | null; counts: Counts }>(
      `/api/tickets?${params.toString()}`,
    );
  },

  getTicket: (id: number) =>
    request<{ ticket: Ticket; messages: Message[] }>(`/api/tickets/${id}`),

  markRead: (id: number) => request<{ ok: true }>(`/api/tickets/${id}/read`, { method: 'POST' }),
  claim: (id: number, name?: string) =>
    request<{ ticket: Ticket }>(`/api/tickets/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    }),
  release: (id: number) => request<{ ticket: Ticket }>(`/api/tickets/${id}/release`, { method: 'POST' }),
  close: (id: number) => request<{ ticket: Ticket }>(`/api/tickets/${id}/close`, { method: 'POST' }),
  reopen: (id: number) => request<{ ticket: Ticket }>(`/api/tickets/${id}/reopen`, { method: 'POST' }),

  sendMessage: (id: number, text: string, file?: File | null) => {
    const fd = new FormData();
    if (text) fd.append('text', text);
    if (file) fd.append('file', file);
    return request<{ message: Message }>(`/api/tickets/${id}/messages`, { method: 'POST', body: fd });
  },

  // Web Push
  getVapid: () => request<{ publicKey: string; enabled: boolean }>('/api/push/vapid'),
  pushSubscribe: (subscription: unknown) =>
    request<{ ok: true }>('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
  pushUnsubscribe: (endpoint: string) =>
    request<{ ok: true }>('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  pushTest: () =>
    request<{ sent: number; failed: number; errors: string[] }>('/api/push/test', { method: 'POST' }),

  // Templates (canned replies)
  listTemplates: () => request<{ templates: Template[] }>('/api/templates'),
  createTemplate: (name: string, text: string) =>
    request<{ template: Template }>('/api/templates', { method: 'POST', body: JSON.stringify({ name, text }) }),
  deleteTemplate: (id: number) => request<{ ok: true }>(`/api/templates/${id}`, { method: 'DELETE' }),

  listOperators: () => request<{ operators: Operator[] }>('/api/operators'),
  createOperator: (data: { username: string; password: string; displayName: string; role: string }) =>
    request<{ operator: Operator }>('/api/operators', { method: 'POST', body: JSON.stringify(data) }),
  updateOperator: (id: number, data: Partial<{ displayName: string; password: string; role: string; isActive: boolean }>) =>
    request<{ operator: Operator }>(`/api/operators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export function mediaUrl(fileId: string): string {
  return `/api/media/${encodeURIComponent(fileId)}?token=${encodeURIComponent(getToken() ?? '')}`;
}

export function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws?token=${encodeURIComponent(getToken() ?? '')}`;
}

export { ApiError };
