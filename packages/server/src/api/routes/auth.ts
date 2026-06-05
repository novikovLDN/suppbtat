import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { checkPassword, signToken, requireAuth } from '../auth.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });

    const { username, password } = parsed.data;
    const op = await prisma.operator.findUnique({ where: { username } });
    if (!op || !op.isActive || !(await checkPassword(password, op.passwordHash))) {
      return reply.code(401).send({ error: 'Неверный логин или пароль' });
    }

    await prisma.operator.update({ where: { id: op.id }, data: { lastSeenAt: new Date() } });

    const token = signToken({
      sub: op.id,
      username: op.username,
      role: op.role,
      name: op.displayName,
    });

    return {
      token,
      operator: { id: op.id, username: op.username, displayName: op.displayName, role: op.role },
    };
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (req) => {
    const op = await prisma.operator.findUnique({ where: { id: req.operator!.sub } });
    return {
      operator: op
        ? { id: op.id, username: op.username, displayName: op.displayName, role: op.role }
        : null,
    };
  });
}
