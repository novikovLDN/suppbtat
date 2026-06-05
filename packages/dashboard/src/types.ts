export type Role = 'ADMIN' | 'OPERATOR';
export type TicketStatus = 'OPEN' | 'CLOSED';
export type Sender = 'CUSTOMER' | 'OPERATOR' | 'SYSTEM';

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
  subject: string | null;
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
}

export type Scope = 'all' | 'unassigned' | 'mine' | 'closed';

export type WsEvent =
  | { type: 'ready'; operator: { id: number; name: string } }
  | { type: 'ticket:new'; ticket: Ticket }
  | { type: 'ticket:updated'; ticket: Ticket }
  | { type: 'message:new'; ticketId: number; message: Message };
