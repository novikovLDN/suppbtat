import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Priority } from '@prisma/client';
import { requireAuth, requireAdmin } from '../auth.js';
import {
  listTickets,
  getTicketById,
  assignTicket,
  unassignTicket,
  transferTicket,
  updateTicketMeta,
  nextUnassignedTicket,
  openTicketIds,
  closeTicket,
  reopenTicket,
  markTicketRead,
  setClaimNotified,
  listCustomerTickets,
  countsByScope,
} from '../../services/tickets.js';
import { listMessages, addOperatorMessage, addSystemMessage, notifyCustomer } from '../../services/messages.js';
import { serializeTicket } from '../../services/serializers.js';
import { t } from '../../bot/texts.js';
import { isValidPersona, randomPersona } from '../../bot/personas.js';
import { logger } from '../../lib/logger.js';

const listQuery = z.object({
  scope: z.enum(['all', 'unassigned', 'mine', 'closed']).default('all'),
  search: z.string().optional(),
  sort: z.enum(['recent', 'waiting']).optional(),
  cursor: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

type TicketRow = NonNullable<Awaited<ReturnType<typeof getTicketById>>>;

/** Shared claim logic: assign to operator, choose persona, notify once. */
async function claim(ticket: TicketRow, operatorId: number, operatorName: string, requested?: string) {
  const persona = ticket.claimNotified
    ? ticket.assignedName || randomPersona()
    : requested && isValidPersona(requested)
      ? requested
      : randomPersona();

  let updated = await assignTicket(ticket.id, operatorId, persona);
  await addSystemMessage(ticket.id, `Взят в работу: ${operatorName} (как «${persona}»).`);
  if (!ticket.claimNotified) {
    await notifyCustomer(ticket.id, t.claimedNotice(persona)).catch(() => {});
    updated = await setClaimNotified(ticket.id, persona);
  }
  return updated;
}

// Guard so a second "close all" can't run while one is in progress.
let bulkClosing = false;

/**
 * Close every open ticket, notifying each customer. Runs in the background in
 * batches of 20 per second to stay well under Telegram's send-rate limits.
 */
async function closeAllOpen(operatorName: string) {
  if (bulkClosing) return;
  bulkClosing = true;
  try {
    const ids = await openTicketIds();
    logger.info(`close-all: closing ${ids.length} tickets (~20/s) by ${operatorName}`);
    const BATCH = 20;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (id) => {
          try {
            await closeTicket(id);
            await addSystemMessage(id, `Массовое закрытие: ${operatorName}.`);
            await notifyCustomer(id, t.ticketClosedByOperator(id));
          } catch (e) {
            logger.warn(`close-all: failed on #${id}`, e);
          }
        }),
      );
      if (i + BATCH < ids.length) await new Promise((r) => setTimeout(r, 1000));
    }
    logger.info(`close-all: done (${ids.length})`);
  } finally {
    bulkClosing = false;
  }
}

export async function ticketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Admin-only: close ALL open tickets. Fire-and-forget; progress streams over
  // WebSocket as each ticket closes.
  app.post('/api/tickets/close-all', { preHandler: requireAdmin }, async (req, reply) => {
    if (bulkClosing) return reply.code(409).send({ error: 'Массовое закрытие уже выполняется' });
    const ids = await openTicketIds();
    void closeAllOpen(req.operator!.name);
    return { started: ids.length };
  });

  app.get('/api/tickets', async (req) => {
    const q = listQuery.parse(req.query);
    const result = await listTickets({
      scope: q.scope,
      operatorId: req.operator!.sub,
      search: q.search,
      sort: q.sort,
      cursor: q.cursor,
      limit: q.limit,
    });
    const counts = await countsByScope(req.operator!.sub);
    return { ...result, counts };
  });

  app.get('/api/tickets/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    const messages = await listMessages(id);
    // customer's previous tickets (context)
    const history = (await listCustomerTickets(ticket.customerId, 15))
      .filter((h) => h.id !== id)
      .map(serializeTicket);
    return { ticket: serializeTicket(ticket), messages, history };
  });

  app.post('/api/tickets/:id/read', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    await markTicketRead(id);
    return { ok: true };
  });

  app.post('/api/tickets/:id/claim', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    if (ticket.status !== 'OPEN') return reply.code(409).send({ error: 'Ticket is closed' });
    const requested = (req.body as { name?: string } | undefined)?.name;
    const updated = await claim(ticket, req.operator!.sub, req.operator!.name, requested);
    return { ticket: serializeTicket(updated) };
  });

  // Take the single longest-waiting unassigned ticket.
  app.post('/api/tickets/claim-next', async (req, reply) => {
    const ticket = await nextUnassignedTicket();
    if (!ticket) return reply.code(404).send({ error: 'Очередь пуста' });
    const requested = (req.body as { name?: string } | undefined)?.name;
    const updated = await claim(ticket, req.operator!.sub, req.operator!.name, requested);
    return { ticket: serializeTicket(updated) };
  });

  // Transfer to another operator.
  app.post('/api/tickets/:id/transfer', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = z.object({ operatorId: z.number().int() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' });
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    const updated = await transferTicket(id, body.data.operatorId);
    await addSystemMessage(id, `Передан оператору: ${updated.assignedOperator?.displayName ?? '—'}.`);
    return { ticket: serializeTicket(updated) };
  });

  // Priority / tags.
  app.patch('/api/tickets/:id/meta', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = z
      .object({
        priority: z.nativeEnum(Priority).optional(),
        tags: z.array(z.string().min(1).max(24)).max(8).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' });
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    const updated = await updateTicketMeta(id, body.data);
    return { ticket: serializeTicket(updated) };
  });

  app.post('/api/tickets/:id/release', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    const updated = await unassignTicket(id);
    await addSystemMessage(id, `Оператор ${req.operator!.name} вернул тикет в очередь.`);
    return { ticket: serializeTicket(updated) };
  });

  app.post('/api/tickets/:id/close', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    const updated = await closeTicket(id);
    await addSystemMessage(id, `Тикет закрыт оператором ${req.operator!.name}.`);
    await notifyCustomer(id, t.ticketClosedByOperator(id)).catch(() => {});
    return { ticket: serializeTicket(updated) };
  });

  app.post('/api/tickets/:id/reopen', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    const updated = await reopenTicket(id);
    await addSystemMessage(id, `Тикет переоткрыт оператором ${req.operator!.name}.`);
    return { ticket: serializeTicket(updated) };
  });

  // Send a message to the customer, or add an internal note.
  // multipart/form-data: fields "text", "internal"; file "file".
  app.post('/api/tickets/:id/messages', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });

    let text: string | null = null;
    let internal = false;
    let photo: { buffer: Buffer; filename: string } | null = null;
    let document: { buffer: Buffer; filename: string } | null = null;

    if (req.isMultipart()) {
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          const isImage = (part.mimetype || '').startsWith('image/');
          if (isImage) photo = { buffer, filename: part.filename || 'image.jpg' };
          else document = { buffer, filename: part.filename || 'file' };
        } else if (part.fieldname === 'text') {
          text = String(part.value ?? '') || null;
        } else if (part.fieldname === 'internal') {
          internal = String(part.value) === 'true';
        }
      }
    } else {
      const body = req.body as { text?: string; internal?: boolean } | undefined;
      text = body?.text?.trim() || null;
      internal = body?.internal === true;
    }

    // Closed tickets accept internal notes but not customer messages.
    if (!internal && ticket.status !== 'OPEN') {
      return reply.code(409).send({ error: 'Ticket is closed' });
    }
    if (!text && !photo && !document) {
      return reply.code(400).send({ error: 'Пустое сообщение' });
    }
    if (internal && !text) {
      return reply.code(400).send({ error: 'Заметка не может быть пустой' });
    }

    try {
      const message = await addOperatorMessage(id, req.operator!.sub, {
        text,
        photo,
        document,
        internal,
      });
      if (!internal && !ticket.assignedOperatorId) {
        await assignTicket(id, req.operator!.sub);
      }
      return { message };
    } catch (err) {
      logger.error('send message failed', err);
      return reply.code(502).send({ error: 'Не удалось доставить сообщение в Telegram' });
    }
  });
}
