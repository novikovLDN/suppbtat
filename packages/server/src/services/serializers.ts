import type { Ticket, Customer, Operator, Message } from '@prisma/client';
import { config } from '../config.js';
import type { SerializedTicket, SerializedMessage } from './events.js';

export function ticketNumber(id: number): number {
  return config.ticketNumberOffset + id;
}

type TicketWithRelations = Ticket & {
  customer: Customer;
  assignedOperator?: Operator | null;
};

export function serializeTicket(t: TicketWithRelations): SerializedTicket {
  return {
    id: t.id,
    number: ticketNumber(t.id),
    status: t.status,
    assignedOperatorId: t.assignedOperatorId,
    assignedOperatorName: t.assignedOperator?.displayName ?? null,
    subject: t.subject,
    customer: {
      id: t.customer.id.toString(),
      username: t.customer.username,
      firstName: t.customer.firstName,
      lastName: t.customer.lastName,
    },
    unreadForOperator: t.unreadForOperator,
    lastMessageAt: t.lastMessageAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

type MessageWithOperator = Message & { operator?: Operator | null };

export function serializeMessage(m: MessageWithOperator): SerializedMessage {
  return {
    id: m.id.toString(),
    ticketId: m.ticketId,
    sender: m.sender,
    operatorId: m.operatorId,
    operatorName: m.operator?.displayName ?? null,
    text: m.text,
    mediaType: m.mediaType,
    mediaFileId: m.mediaFileId,
    fileName: m.fileName,
    createdAt: m.createdAt.toISOString(),
  };
}
