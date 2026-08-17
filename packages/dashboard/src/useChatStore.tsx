import { useCallback, useEffect, useRef, useState } from 'react';
import { api, wsUrl } from './api';
import { playChime } from './lib/sound';
import type {
  Counts,
  JiraStatus,
  JiraTask,
  Message,
  Operator,
  Priority,
  Scope,
  SortMode,
  Ticket,
  WsEvent,
} from './types';

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

function sortTickets(list: Ticket[], sort: SortMode): Ticket[] {
  const copy = [...list];
  if (sort === 'waiting') {
    return copy.sort((a, b) => {
      const aw = a.firstWaitingAt ? new Date(a.firstWaitingAt).getTime() : Infinity;
      const bw = b.firstWaitingAt ? new Date(b.firstWaitingAt).getTime() : Infinity;
      return aw - bw; // longest waiting first
    });
  }
  return copy.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
}

export function useChatStore(operator: Operator) {
  const [scope, setScope] = useState<Scope>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({ unassigned: 0, mine: 0, open: 0, inWork: 0, waiting: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<Ticket[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [jiraTasks, setJiraTasks] = useState<JiraTask[]>([]);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sortRef = useRef(sort);
  sortRef.current = sort;
  const searchRef = useRef(search);
  searchRef.current = search;

  // live clock for waiting timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);

  // load the Jira board once
  useEffect(() => {
    api.listJira().then((r) => setJiraTasks(r.tasks)).catch(() => {});
  }, []);

  const upsertJira = useCallback((task: JiraTask) => {
    setJiraTasks((prev) => {
      const without = prev.filter((x) => x.id !== task.id);
      return [task, ...without].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    });
  }, []);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api.listTickets(scopeRef.current, {
        search: searchRef.current || undefined,
        sort: sortRef.current,
      });
      setTickets(sortTickets(r.tickets, sortRef.current));
      setCounts(r.counts);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(refreshList, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [scope, sort, search, refreshList]);

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
        return inScope ? sortTickets([t, ...without], sortRef.current) : without;
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
        if (data.type === 'ticket:new') {
          upsertLocal(data.ticket);
          scheduleReconcile();
        } else if (data.type === 'ticket:updated') {
          upsertLocal(data.ticket);
          scheduleReconcile();
        } else if (data.type === 'message:new') {
          if (data.message.sender === 'CUSTOMER') playChime();
          if (selectedIdRef.current === data.ticketId) {
            setMessages((prev) =>
              prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
            );
          }
        } else if (data.type === 'jira:new' || data.type === 'jira:updated') {
          upsertJira(data.task);
        }
      };
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [upsertLocal, scheduleReconcile, upsertJira]);

  const selectTicket = useCallback(async (id: number) => {
    setSelectedId(id);
    const r = await api.getTicket(id);
    setSelected(r.ticket);
    setMessages(r.messages);
    setHistory(r.history || []);
    if (r.ticket.unreadForOperator > 0) {
      api.markRead(id).catch(() => {});
    }
  }, []);

  const deselect = useCallback(() => {
    setSelectedId(null);
    setSelected(null);
    setMessages([]);
    setHistory([]);
  }, []);

  const sendMessage = useCallback(async (text: string, file?: File | null, internal?: boolean) => {
    if (!selectedIdRef.current) return;
    const r = await api.sendMessage(selectedIdRef.current, text, file, internal);
    setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
  }, []);

  const doAction = useCallback(
    async (action: 'release' | 'close' | 'reopen') => {
      if (!selectedIdRef.current) return;
      const r = await api[action](selectedIdRef.current);
      setSelected(r.ticket);
      upsertLocal(r.ticket);
    },
    [upsertLocal],
  );

  const claim = useCallback(
    async (name?: string) => {
      if (!selectedIdRef.current) return;
      const r = await api.claim(selectedIdRef.current, name);
      setSelected(r.ticket);
      upsertLocal(r.ticket);
    },
    [upsertLocal],
  );

  const claimNext = useCallback(
    async (name?: string) => {
      const r = await api.claimNext(name);
      upsertLocal(r.ticket);
      await selectTicket(r.ticket.id);
      return r.ticket;
    },
    [upsertLocal, selectTicket],
  );

  const transfer = useCallback(
    async (operatorId: number) => {
      if (!selectedIdRef.current) return;
      const r = await api.transfer(selectedIdRef.current, operatorId);
      setSelected(r.ticket);
      upsertLocal(r.ticket);
    },
    [upsertLocal],
  );

  const setMeta = useCallback(
    async (data: { priority?: Priority; tags?: string[] }) => {
      if (!selectedIdRef.current) return;
      const r = await api.setMeta(selectedIdRef.current, data);
      setSelected(r.ticket);
      upsertLocal(r.ticket);
    },
    [upsertLocal],
  );

  const createJira = useCallback(
    async (ticketId: number, comment?: string, notify?: boolean) => {
      const r = await api.createJira(ticketId, comment, notify);
      upsertJira(r.task);
      return r.task;
    },
    [upsertJira],
  );

  const updateJira = useCallback(
    async (id: number, status: JiraStatus) => {
      // optimistic
      setJiraTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      const r = await api.updateJiraStatus(id, status);
      upsertJira(r.task);
    },
    [upsertJira],
  );

  const notifyJiraDone = useCallback(
    async (id: number) => {
      const r = await api.notifyJiraDone(id);
      upsertJira(r.task);
    },
    [upsertJira],
  );

  return {
    scope,
    setScope,
    sort,
    setSort,
    search,
    setSearch,
    tickets,
    counts,
    selectedId,
    selected,
    messages,
    history,
    connected,
    loadingList,
    now,
    jiraTasks,
    selectTicket,
    deselect,
    sendMessage,
    refreshList,
    claim,
    claimNext,
    transfer,
    setMeta,
    createJira,
    updateJira,
    notifyJiraDone,
    release: () => doAction('release'),
    close: () => doAction('close'),
    reopen: () => doAction('reopen'),
  };
}

export type ChatStore = ReturnType<typeof useChatStore>;
