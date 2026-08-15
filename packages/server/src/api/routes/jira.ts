import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { JiraStatus } from '@prisma/client';
import { requireAuth } from '../auth.js';
import { getTicketById } from '../../services/tickets.js';
import {
  createJiraTask,
  listJiraTasks,
  updateJiraStatus,
  getJiraTask,
} from '../../services/jira.js';
import { serializeJiraTask } from '../../services/serializers.js';

const createSchema = z.object({
  ticketId: z.number().int(),
  comment: z.string().max(2000).optional(),
});

const statusSchema = z.object({
  status: z.nativeEnum(JiraStatus),
});

export async function jiraRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // All Jira tasks (board data).
  app.get('/api/jira', async () => {
    const tasks = await listJiraTasks();
    return { tasks };
  });

  // Raise a new task from a ticket.
  app.post('/api/jira', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });

    const ticket = await getTicketById(parsed.data.ticketId);
    if (!ticket) return reply.code(404).send({ error: 'Тикет не найден' });

    const task = await createJiraTask({
      ticketId: ticket.id,
      comment: parsed.data.comment ?? null,
      createdById: req.operator!.sub,
      createdByName: req.operator!.name,
    });
    return { task: serializeJiraTask(task) };
  });

  // Move a task between statuses on the board.
  app.patch('/api/jira/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });
    const existing = await getJiraTask(id);
    if (!existing) return reply.code(404).send({ error: 'Задача не найдена' });
    const task = await updateJiraStatus(id, parsed.data.status);
    return { task: serializeJiraTask(task) };
  });
}
