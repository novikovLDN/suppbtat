import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { requireAdmin, requireAuth, hashPassword } from '../auth.js';

const createSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(6).max(72),
  displayName: z.string().min(1).max(64),
  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
});

const updateSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  password: z.string().min(6).max(72).optional(),
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),
  isActive: z.boolean().optional(),
});

function publicOperator(o: {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: o.id,
    username: o.username,
    displayName: o.displayName,
    role: o.role,
    isActive: o.isActive,
    lastSeenAt: o.lastSeenAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function operatorRoutes(app: FastifyInstance) {
  // Any authenticated operator can see the roster (for assignment labels).
  app.get('/api/operators', { preHandler: requireAuth }, async () => {
    const ops = await prisma.operator.findMany({ orderBy: { createdAt: 'asc' } });
    return { operators: ops.map(publicOperator) };
  });

  app.post('/api/operators', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });

    const exists = await prisma.operator.findUnique({ where: { username: parsed.data.username } });
    if (exists) return reply.code(409).send({ error: 'Логин уже занят' });

    const op = await prisma.operator.create({
      data: {
        username: parsed.data.username,
        displayName: parsed.data.displayName,
        role: parsed.data.role as Role,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    return { operator: publicOperator(op) };
  });

  app.patch('/api/operators/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });

    const data: Record<string, unknown> = {};
    if (parsed.data.displayName) data.displayName = parsed.data.displayName;
    if (parsed.data.role) data.role = parsed.data.role;
    if (typeof parsed.data.isActive === 'boolean') data.isActive = parsed.data.isActive;
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

    const op = await prisma.operator.update({ where: { id }, data });
    return { operator: publicOperator(op) };
  });
}
