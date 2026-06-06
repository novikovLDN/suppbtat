import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import {
  listTickets,
  getTicketById,
  assignTicket,
  unassignTicket,
  closeTicket,
  reopenTicket,
  markTicketRead,
  setClaimNotified,
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
  cursor: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function ticketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/tickets', async (req) => {
    const q = listQuery.parse(req.query);
    const result = await listTickets({
      scope: q.scope,
      operatorId: req.operator!.sub,
      search: q.search,
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
    return { ticket: serializeTicket(ticket), messages };
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

    // Persona shown to the customer. Once notified, keep it stable; otherwise
    // use the name chosen in the dashboard, falling back to a random one.
    const requested = (req.body as { name?: string } | undefined)?.name;
    const persona = ticket.claimNotified
      ? ticket.assignedName || randomPersona()
      : requested && isValidPersona(requested)
        ? requested
        : randomPersona();

    // Always (re)assign to this operator; keep the persona consistent.
    let updated = await assignTicket(id, req.operator!.sub, persona);
    await addSystemMessage(id, `Взят в работу: ${req.operator!.name} (как «${persona}»).`);

    // Customer-facing "taken into work" notice — exactly once per ticket.
    if (!ticket.claimNotified) {
      await notifyCustomer(id, t.claimedNotice(persona)).catch(() => {});
      updated = await setClaimNotified(id, persona);
    }
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

  // Send a message to the customer. multipart/form-data: field "text" and/or file "file".
  app.post('/api/tickets/:id/messages', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ticket = await getTicketById(id);
    if (!ticket) return reply.code(404).send({ error: 'Not found' });
    if (ticket.status !== 'OPEN') return reply.code(409).send({ error: 'Ticket is closed' });

    let text: string | null = null;
    let photo: { buffer: Buffer; filename: string } | null = null;
    let document: { buffer: Buffer; filename: string } | null = null;

    if (req.isMultipart()) {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          const isImage = (part.mimetype || '').startsWith('image/');
          if (isImage) photo = { buffer, filename: part.filename || 'image.jpg' };
          else document = { buffer, filename: part.filename || 'file' };
        } else if (part.fieldname === 'text') {
          text = String(part.value ?? '') || null;
        }
      }
    } else {
      const body = req.body as { text?: string } | undefined;
      text = body?.text?.trim() || null;
    }

    if (!text && !photo && !document) {
      return reply.code(400).send({ error: 'Пустое сообщение' });
    }

    try {
      const message = await addOperatorMessage(id, req.operator!.sub, { text, photo, document });
      // Auto-claim on first reply if unassigned, so it shows as "in work".
      if (!ticket.assignedOperatorId) {
        await assignTicket(id, req.operator!.sub);
      }
      return { message };
    } catch (err) {
      logger.error('send message failed', err);
      return reply.code(502).send({ error: 'Не удалось доставить сообщение в Telegram' });
    }
  });
}
