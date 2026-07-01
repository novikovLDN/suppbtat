import { InputFile } from 'grammy';
import { Sender } from '@prisma/client';
import { prisma } from '../db.js';
import { bot } from '../bot/instance.js';
import { bus } from './events.js';
import { serializeMessage, serializeTicket } from './serializers.js';
import { getTicketById } from './tickets.js';
import { logger } from '../lib/logger.js';

export interface IncomingMedia {
  type: 'photo' | 'document' | 'video' | 'voice';
  fileId: string;
  fileName?: string | null;
}

/** Persist a message a customer sent us (already received from Telegram). */
export async function addCustomerMessage(
  ticketId: number,
  data: { text?: string | null; media?: IncomingMedia | null; telegramMessageId?: number | null },
) {
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        ticketId,
        sender: Sender.CUSTOMER,
        text: data.text ?? null,
        mediaType: data.media?.type ?? null,
        mediaFileId: data.media?.fileId ?? null,
        fileName: data.media?.fileName ?? null,
        telegramMessageId: data.telegramMessageId ?? null,
      },
      include: { operator: true },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { lastMessageAt: new Date(), unreadForOperator: { increment: 1 } },
    }),
  ]);

  // Start the "waiting for reply" clock if not already waiting.
  await prisma.ticket.updateMany({
    where: { id: ticketId, firstWaitingAt: null },
    data: { firstWaitingAt: new Date() },
  });

  bus.publish({ type: 'message:new', ticketId, message: serializeMessage(message) });
  // Push the refreshed ticket (unread count, ordering) to operators.
  const ticket = await getTicketById(ticketId);
  if (ticket) {
    bus.publish({ type: 'ticket:updated', ticket: serializeTicket(ticket) });
  }
  return message;
}

/** Record a system note in a ticket (e.g. "ticket closed"). Not sent to Telegram. */
export async function addSystemMessage(ticketId: number, text: string) {
  const message = await prisma.message.create({
    data: { ticketId, sender: Sender.SYSTEM, text },
    include: { operator: true },
  });
  bus.publish({ type: 'message:new', ticketId, message: serializeMessage(message) });
  return message;
}

/**
 * Operator -> customer. Sends to Telegram, then persists. Supports text,
 * a photo (with optional caption), or a document.
 */
export async function addOperatorMessage(
  ticketId: number,
  operatorId: number,
  data: {
    text?: string | null;
    photo?: { buffer: Buffer; filename: string } | null;
    document?: { buffer: Buffer; filename: string } | null;
    internal?: boolean;
  },
) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  // Internal note: store for operators only, never delivered to the customer,
  // and it does not answer the customer's wait.
  if (data.internal) {
    const note = await prisma.message.create({
      data: {
        ticketId,
        sender: Sender.OPERATOR,
        operatorId,
        internal: true,
        text: data.text ?? null,
      },
      include: { operator: true },
    });
    bus.publish({ type: 'message:new', ticketId, message: serializeMessage(note) });
    return note;
  }

  const chatId = ticket.customer.id.toString();
  let mediaType: IncomingMedia['type'] | null = null;
  let mediaFileId: string | null = null;
  let fileName: string | null = null;
  let telegramMessageId: number | null = null;
  const caption = data.text?.trim() || undefined;

  try {
    if (data.photo) {
      const sent = await bot.api.sendPhoto(chatId, new InputFile(data.photo.buffer, data.photo.filename), {
        caption,
      });
      telegramMessageId = sent.message_id;
      mediaType = 'photo';
      // store the largest size's file_id so the dashboard can render it back
      const sizes = sent.photo ?? [];
      mediaFileId = sizes.length ? sizes[sizes.length - 1].file_id : null;
      fileName = data.photo.filename;
    } else if (data.document) {
      const sent = await bot.api.sendDocument(chatId, new InputFile(data.document.buffer, data.document.filename), {
        caption,
      });
      telegramMessageId = sent.message_id;
      mediaType = 'document';
      mediaFileId = sent.document?.file_id ?? null;
      fileName = sent.document?.file_name ?? data.document.filename;
    } else if (caption) {
      const sent = await bot.api.sendMessage(chatId, caption);
      telegramMessageId = sent.message_id;
    } else {
      throw new Error('Empty message');
    }
  } catch (err) {
    logger.error('Failed to deliver operator message to Telegram', err);
    throw err;
  }

  const message = await prisma.message.create({
    data: {
      ticketId,
      sender: Sender.OPERATOR,
      operatorId,
      text: data.text ?? null,
      mediaType,
      mediaFileId,
      fileName,
      telegramMessageId,
    },
    include: { operator: true },
  });

  // Operator answered → stop the waiting clock.
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { lastMessageAt: new Date(), firstWaitingAt: null },
  });

  bus.publish({ type: 'message:new', ticketId, message: serializeMessage(message) });
  const updated = await getTicketById(ticketId);
  if (updated) bus.publish({ type: 'ticket:updated', ticket: serializeTicket(updated) });
  return message;
}

export async function listMessages(ticketId: number, limit = 200) {
  const messages = await prisma.message.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: { operator: true },
  });
  return messages.map(serializeMessage);
}

/**
 * Send a plain notification to a customer's chat (e.g. "operator joined",
 * "ticket closed"). Best-effort; failures are logged, not thrown. Uses HTML so
 * formatting tags (<b>, <tg-emoji>) render instead of leaking as text.
 */
export async function notifyCustomer(ticketId: number, text: string) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return;
  try {
    await bot.api.sendMessage(ticket.customer.id.toString(), text, { parse_mode: 'HTML' });
  } catch (err) {
    logger.warn('notifyCustomer failed', err);
  }
}
