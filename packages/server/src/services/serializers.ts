import type { Ticket, Customer, Operator, Message, JiraTask } from '@prisma/client';
import { config } from '../config.js';
import type { SerializedTicket, SerializedMessage, SerializedJiraTask } from './events.js';

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
    assignedName: t.assignedName ?? null,
    subject: t.subject,
    priority: t.priority,
    tags: t.tags ?? [],
    firstWaitingAt: t.firstWaitingAt ? t.firstWaitingAt.toISOString() : null,
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
    rating: t.rating ?? null,
    ratedAt: t.ratedAt ? t.ratedAt.toISOString() : null,
  };
}

type JiraWithRelations = JiraTask & {
  ticket: Ticket & { customer: Customer };
};

export function serializeJiraTask(j: JiraWithRelations): SerializedJiraTask {
  return {
    id: j.id,
    key: j.key,
    ticketId: j.ticketId,
    ticketNumber: ticketNumber(j.ticketId),
    ticketStatus: j.ticket.status,
    title: j.title,
    description: j.description,
    comment: j.comment,
    status: j.status,
    priority: j.ticket.priority,
    tags: j.ticket.tags ?? [],
    createdByName: j.createdByName ?? null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    customer: {
      id: j.ticket.customer.id.toString(),
      username: j.ticket.customer.username,
      firstName: j.ticket.customer.firstName,
      lastName: j.ticket.customer.lastName,
    },
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
    internal: m.internal ?? false,
    text: m.text,
    mediaType: m.mediaType,
    mediaFileId: m.mediaFileId,
    fileName: m.fileName,
    createdAt: m.createdAt.toISOString(),
  };
}
