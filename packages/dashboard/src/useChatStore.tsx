import { useCallback, useEffect, useRef, useState } from 'react';
import { api, wsUrl } from './api';
import type { Counts, Message, Operator, Scope, Ticket, WsEvent } from './types';

function scopeMatches(t: Ticket, scope: Scope, operatorId: number): boolean {
  switch (scope) {
    case 'unassigned':
      return t.status === 'OPEN' && t.assignedOperatorId === null;
    case 'mine':
      return t.status === 'OPEN' && t.assignedOperatorId === operatorId;
    case 'closed':
      return t.status === 'CLOSED';
    case 'all':
    default:
      return t.status === 'OPEN';
  }
}

function sortTickets(list: Ticket[]): Ticket[] {
  return [...list].sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
}

export function useChatStore(operator: Operator) {
  const [scope, setScope] = useState<Scope>('all');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({ unassigned: 0, mine: 0, open: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const searchRef = useRef(search);
  searchRef.current = search;

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api.listTickets(scopeRef.current, searchRef.current || undefined);
      setTickets(sortTickets(r.tickets));
      setCounts(r.counts);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // reload when scope/search changes (debounced for search)
  useEffect(() => {
    const id = setTimeout(refreshList, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [scope, search, refreshList]);

  // debounced reconcile after bursts of ws events
  const reconcileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReconcile = useCallback(() => {
    if (reconcileTimer.current) clearTimeout(reconcileTimer.current);
    reconcileTimer.current = setTimeout(refreshList, 800);
  }, [refreshList]);

  const upsertLocal = useCallback(
    (t: Ticket) => {
      setTickets((prev) => {
        const inScope = !searchRef.current && scopeMatches(t, scopeRef.current, operator.id);
        const without = prev.filter((x) => x.id !== t.id);
        return inScope ? sortTickets([t, ...without]) : without;
      });
      if (selectedIdRef.current === t.id) setSelected(t);
    },
    [operator.id],
  );

  // WebSocket lifecycle with auto-reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (ev) => {
        let data: WsEvent;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (data.type === 'ticket:new' || data.type === 'ticket:updated') {
          upsertLocal(data.ticket);
          scheduleReconcile();
        } else if (data.type === 'message:new') {
          if (selectedIdRef.current === data.ticketId) {
            setMessages((prev) =>
              prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
            );
          }
        }
      };
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [upsertLocal, scheduleReconcile]);

  const selectTicket = useCallback(async (id: number) => {
    setSelectedId(id);
    const r = await api.getTicket(id);
    setSelected(r.ticket);
    setMessages(r.messages);
    if (r.ticket.unreadForOperator > 0) {
      api.markRead(id).catch(() => {});
    }
  }, []);

  const deselect = useCallback(() => {
    setSelectedId(null);
    setSelected(null);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (text: string, file?: File | null) => {
      if (!selectedIdRef.current) return;
      const r = await api.sendMessage(selectedIdRef.current, text, file);
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
    },
    [],
  );

  const doAction = useCallback(
    async (action: 'claim' | 'release' | 'close' | 'reopen') => {
      if (!selectedIdRef.current) return;
      const r = await api[action](selectedIdRef.current);
      setSelected(r.ticket);
      upsertLocal(r.ticket);
    },
    [upsertLocal],
  );

  return {
    scope,
    setScope,
    search,
    setSearch,
    tickets,
    counts,
    selectedId,
    selected,
    messages,
    connected,
    loadingList,
    selectTicket,
    deselect,
    sendMessage,
    refreshList,
    claim: () => doAction('claim'),
    release: () => doAction('release'),
    close: () => doAction('close'),
    reopen: () => doAction('reopen'),
  };
}

export type ChatStore = ReturnType<typeof useChatStore>;
