import { Prisma, TicketStatus } from '@prisma/client';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { bus } from './events.js';
import { serializeTicket } from './serializers.js';

const ticketInclude = {
  customer: true,
  assignedOperator: true,
} satisfies Prisma.TicketInclude;

export interface TgUser {
  id: number | bigint;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export async function upsertCustomer(u: TgUser) {
  return prisma.customer.upsert({
    where: { id: BigInt(u.id) },
    create: {
      id: BigInt(u.id),
      username: u.username ?? null,
      firstName: u.first_name ?? null,
      lastName: u.last_name ?? null,
      languageCode: u.language_code ?? null,
    },
    update: {
      username: u.username ?? null,
      firstName: u.first_name ?? null,
      lastName: u.last_name ?? null,
    },
  });
}

/** The customer's currently-open ticket, if any. */
export async function findActiveTicket(customerId: bigint) {
  return prisma.ticket.findFirst({
    where: { customerId, status: TicketStatus.OPEN },
    orderBy: { id: 'desc' },
    include: ticketInclude,
  });
}

export async function createTicket(customerId: bigint, subject: string | null) {
  const ticket = await prisma.ticket.create({
    data: { customerId, subject: subject?.slice(0, 120) ?? null },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:new', ticket: serializeTicket(ticket) });
  return ticket;
}

/** Returns the active ticket or creates a fresh one. */
export async function getOrCreateActiveTicket(customerId: bigint, subject: string | null) {
  const existing = await findActiveTicket(customerId);
  if (existing) return { ticket: existing, created: false as const };
  const ticket = await createTicket(customerId, subject);
  return { ticket, created: true as const };
}

export async function listCustomerTickets(customerId: bigint, limit = 10) {
  return prisma.ticket.findMany({
    where: { customerId },
    orderBy: { id: 'desc' },
    take: limit,
    include: ticketInclude,
  });
}

export async function getTicketById(id: number) {
  return prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
}

export async function assignTicket(ticketId: number, operatorId: number) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedOperatorId: operatorId },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  return ticket;
}

export async function unassignTicket(ticketId: number) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedOperatorId: null },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  return ticket;
}

export async function closeTicket(ticketId: number) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.CLOSED, closedAt: new Date() },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  return ticket;
}

export async function reopenTicket(ticketId: number) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.OPEN, closedAt: null, lastMessageAt: new Date() },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  return ticket;
}

export async function markTicketSupplemented(ticketId: number) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { supplemented: true },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  return ticket;
}

export async function markTicketRead(ticketId: number) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { unreadForOperator: 0 },
    include: ticketInclude,
  });
  bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  return ticket;
}

export interface ListFilter {
  scope: 'all' | 'unassigned' | 'mine' | 'closed';
  operatorId?: number;
  search?: string;
  limit?: number;
  cursor?: number; // ticket id for pagination
}

export async function listTickets(filter: ListFilter) {
  const where: Prisma.TicketWhereInput = {};

  switch (filter.scope) {
    case 'unassigned':
      where.status = TicketStatus.OPEN;
      where.assignedOperatorId = null;
      break;
    case 'mine':
      where.status = TicketStatus.OPEN;
      where.assignedOperatorId = filter.operatorId;
      break;
    case 'closed':
      where.status = TicketStatus.CLOSED;
      break;
    case 'all':
    default:
      where.status = TicketStatus.OPEN;
      break;
  }

  if (filter.search) {
    const s = filter.search.trim();
    const asNumber = Number(s.replace('#', ''));
    where.OR = [
      { subject: { contains: s, mode: 'insensitive' } },
      { customer: { username: { contains: s, mode: 'insensitive' } } },
      { customer: { firstName: { contains: s, mode: 'insensitive' } } },
    ];
    if (Number.isFinite(asNumber) && asNumber > 0) {
      // allow searching by display number (offset + id) or by raw id
      where.OR.push({ id: asNumber });
      where.OR.push({ id: asNumber - config.ticketNumberOffset });
    }
  }

  const take = Math.min(filter.limit ?? 50, 100);
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ lastMessageAt: 'desc' }],
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: ticketInclude,
  });

  const hasMore = tickets.length > take;
  const page = hasMore ? tickets.slice(0, take) : tickets;
  return {
    tickets: page.map(serializeTicket),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function countsByScope(operatorId: number) {
  const [unassigned, mine, openTotal] = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.OPEN, assignedOperatorId: null } }),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN, assignedOperatorId: operatorId } }),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
  ]);
  return { unassigned, mine, open: openTotal };
}
