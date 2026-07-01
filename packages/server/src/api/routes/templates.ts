import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { requireAuth } from '../auth.js';

const createSchema = z.object({
  name: z.string().min(1).max(60),
  text: z.string().min(1).max(4000),
  category: z.string().max(40).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  text: z.string().min(1).max(4000).optional(),
  category: z.string().max(40).nullable().optional(),
  pinned: z.boolean().optional(),
});

export async function templateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/templates', async () => {
    const templates = await prisma.template.findMany({
      orderBy: [{ pinned: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }],
    });
    return { templates };
  });

  app.post('/api/templates', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });
    const template = await prisma.template.create({
      data: {
        name: parsed.data.name.trim(),
        text: parsed.data.text,
        category: parsed.data.category?.trim() || null,
        createdById: req.operator!.sub,
      },
    });
    return { template };
  });

  app.patch('/api/templates/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });
    const template = await prisma.template.update({ where: { id }, data: parsed.data });
    return { template };
  });

  // Bump usage counter so popular templates float to the top.
  app.post('/api/templates/:id/used', async (req) => {
    const id = Number((req.params as { id: string }).id);
    await prisma.template.update({ where: { id }, data: { usageCount: { increment: 1 } } }).catch(() => {});
    return { ok: true };
  });

  app.delete('/api/templates/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    await prisma.template.delete({ where: { id } }).catch(() => {});
    return { ok: true };
  });
}
