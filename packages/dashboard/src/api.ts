import type { Counts, JiraStatus, JiraTask, Message, Operator, Priority, RatingSummary, Scope, SortMode, Stats, Template, Ticket } from './types';

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

  listTickets: (scope: Scope, opts: { search?: string; sort?: SortMode; cursor?: number } = {}) => {
    const params = new URLSearchParams({ scope });
    if (opts.search) params.set('search', opts.search);
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.cursor) params.set('cursor', String(opts.cursor));
    return request<{ tickets: Ticket[]; nextCursor: number | null; counts: Counts }>(
      `/api/tickets?${params.toString()}`,
    );
  },

  getTicket: (id: number) =>
    request<{ ticket: Ticket; messages: Message[]; history: Ticket[] }>(`/api/tickets/${id}`),

  markRead: (id: number) => request<{ ok: true }>(`/api/tickets/${id}/read`, { method: 'POST' }),
  claim: (id: number, name?: string) =>
    request<{ ticket: Ticket }>(`/api/tickets/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    }),
  claimNext: (name?: string) =>
    request<{ ticket: Ticket }>(`/api/tickets/claim-next`, {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    }),
  nextUnassigned: () => request<{ ticket: Ticket }>(`/api/tickets/next-unassigned`),
  transfer: (id: number, operatorId: number) =>
    request<{ ticket: Ticket }>(`/api/tickets/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ operatorId }),
    }),
  setMeta: (id: number, data: { priority?: Priority; tags?: string[] }) =>
    request<{ ticket: Ticket }>(`/api/tickets/${id}/meta`, { method: 'PATCH', body: JSON.stringify(data) }),
  release: (id: number) => request<{ ticket: Ticket }>(`/api/tickets/${id}/release`, { method: 'POST' }),
  close: (id: number) => request<{ ticket: Ticket }>(`/api/tickets/${id}/close`, { method: 'POST' }),
  reopen: (id: number) => request<{ ticket: Ticket }>(`/api/tickets/${id}/reopen`, { method: 'POST' }),

  sendMessage: (id: number, text: string, file?: File | null, internal?: boolean) => {
    const fd = new FormData();
    if (text) fd.append('text', text);
    if (file) fd.append('file', file);
    if (internal) fd.append('internal', 'true');
    return request<{ message: Message }>(`/api/tickets/${id}/messages`, { method: 'POST', body: fd });
  },

  getStats: () => request<Stats>('/api/stats'),
  getRatings: () => request<{ ratings: Ticket[]; summary: RatingSummary }>('/api/ratings'),
  closeAll: () => request<{ started: number }>('/api/tickets/close-all', { method: 'POST' }),

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
  createTemplate: (data: { name: string; text: string; category?: string }) =>
    request<{ template: Template }>('/api/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: number, data: Partial<{ name: string; text: string; category: string | null; pinned: boolean }>) =>
    request<{ template: Template }>(`/api/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  useTemplate: (id: number) => request<{ ok: true }>(`/api/templates/${id}/used`, { method: 'POST' }),
  deleteTemplate: (id: number) => request<{ ok: true }>(`/api/templates/${id}`, { method: 'DELETE' }),

  // Jira board (internal task tracker)
  listJira: () => request<{ tasks: JiraTask[] }>('/api/jira'),
  createJira: (ticketId: number, comment?: string, notify?: boolean) =>
    request<{ task: JiraTask }>('/api/jira', {
      method: 'POST',
      body: JSON.stringify({ ticketId, ...(comment ? { comment } : {}), ...(notify ? { notify: true } : {}) }),
    }),
  updateJiraStatus: (id: number, status: JiraStatus) =>
    request<{ task: JiraTask }>(`/api/jira/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  notifyJiraDone: (id: number) =>
    request<{ task: JiraTask }>(`/api/jira/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notify: true }),
    }),

  listOperators: () => request<{ operators: Operator[] }>('/api/operators'),
  createOperator: (data: { username: string; password: string; displayName: string; role: string }) =>
    request<{ operator: Operator }>('/api/operators', { method: 'POST', body: JSON.stringify(data) }),
  updateOperator: (id: number, data: Partial<{ displayName: string; password: string; role: string; isActive: boolean }>) =>
    request<{ operator: Operator }>(`/api/operators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export function mediaUrl(fileId: string, name?: string): string {
  const params = new URLSearchParams({ token: getToken() ?? '' });
  if (name) params.set('name', name);
  return `/api/media/${encodeURIComponent(fileId)}?${params.toString()}`;
}

export function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws?token=${encodeURIComponent(getToken() ?? '')}`;
}

export { ApiError };
