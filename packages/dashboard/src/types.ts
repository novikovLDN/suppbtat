export type Role = 'ADMIN' | 'OPERATOR';
export type TicketStatus = 'OPEN' | 'CLOSED';
export type Sender = 'CUSTOMER' | 'OPERATOR' | 'SYSTEM';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Operator {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive?: boolean;
  lastSeenAt?: string | null;
  createdAt?: string;
}

export interface Customer {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface Ticket {
  id: number;
  number: number;
  status: TicketStatus;
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
  assignedName: string | null;
  subject: string | null;
  priority: Priority;
  tags: string[];
  firstWaitingAt: string | null;
  customer: Customer;
  unreadForOperator: number;
  lastMessageAt: string;
  createdAt: string;
  closedAt: string | null;
}

export interface Message {
  id: string;
  ticketId: number;
  sender: Sender;
  operatorId: number | null;
  operatorName: string | null;
  internal: boolean;
  text: string | null;
  mediaType: string | null;
  mediaFileId: string | null;
  fileName: string | null;
  createdAt: string;
}

export interface Counts {
  unassigned: number;
  mine: number;
  open: number;
  inWork: number;
  waiting: number;
}

export interface Template {
  id: number;
  name: string;
  text: string;
  category?: string | null;
  usageCount?: number;
  pinned?: boolean;
  createdAt?: string;
}

export interface Stats {
  open: number;
  unassigned: number;
  inWork: number;
  closedTotal: number;
  today: { created: number; closed: number };
  avgFirstResponseMin: number | null;
  avgResolutionMin: number | null;
  perDay: { date: string; count: number }[];
  operators: { id: number; name: string; active: number; replies7d: number }[];
}

export type Scope = 'all' | 'unassigned' | 'mine' | 'closed';
export type SortMode = 'recent' | 'waiting';

export type JiraStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE';

export interface JiraTask {
  id: number;
  key: string;
  ticketId: number;
  ticketNumber: number;
  ticketStatus: TicketStatus;
  title: string;
  description: string | null;
  comment: string | null;
  status: JiraStatus;
  priority: Priority;
  tags: string[];
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
}

export type WsEvent =
  | { type: 'ready'; operator: { id: number; name: string } }
  | { type: 'ticket:new'; ticket: Ticket }
  | { type: 'ticket:updated'; ticket: Ticket }
  | { type: 'message:new'; ticketId: number; message: Message }
  | { type: 'jira:new'; task: JiraTask }
  | { type: 'jira:updated'; task: JiraTask };
