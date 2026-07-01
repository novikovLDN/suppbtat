import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db.js';
import { requireAuth } from '../auth.js';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get('/api/stats', { preHandler: requireAuth }, async () => {
    const today = startOfToday();

    const [open, unassigned, inWork, closedTotal, createdToday, closedToday] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'OPEN', assignedOperatorId: null } }),
      prisma.ticket.count({ where: { status: 'OPEN', assignedOperatorId: { not: null } } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.count({ where: { createdAt: { gte: today } } }),
      prisma.ticket.count({ where: { status: 'CLOSED', closedAt: { gte: today } } }),
    ]);

    const avgFirst = (await prisma.$queryRawUnsafe(`
      SELECT AVG(EXTRACT(EPOCH FROM (fm.first_op - tk."createdAt"))/60) AS m
      FROM "Ticket" tk
      JOIN LATERAL (
        SELECT MIN(m."createdAt") AS first_op FROM "Message" m
        WHERE m."ticketId" = tk.id AND m.sender = 'OPERATOR' AND m.internal = false
      ) fm ON true
      WHERE tk."createdAt" >= now() - interval '7 days' AND fm.first_op IS NOT NULL
    `)) as Array<{ m: number | null }>;

    const avgRes = (await prisma.$queryRawUnsafe(`
      SELECT AVG(EXTRACT(EPOCH FROM (tk."closedAt" - tk."createdAt"))/60) AS m
      FROM "Ticket" tk
      WHERE tk.status = 'CLOSED' AND tk."closedAt" >= now() - interval '7 days'
    `)) as Array<{ m: number | null }>;

    const perDay = (await prisma.$queryRawUnsafe(`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS d, count(*)::int AS c
      FROM "Ticket"
      WHERE "createdAt" >= now() - interval '6 days'
      GROUP BY 1 ORDER BY 1
    `)) as Array<{ d: string; c: number }>;

    const operators = (await prisma.$queryRawUnsafe(`
      SELECT o.id, o."displayName" AS name,
        (SELECT count(*)::int FROM "Ticket" t WHERE t."assignedOperatorId" = o.id AND t.status = 'OPEN') AS active,
        (SELECT count(*)::int FROM "Message" m WHERE m."operatorId" = o.id AND m.sender = 'OPERATOR'
           AND m.internal = false AND m."createdAt" >= now() - interval '7 days') AS replies7d
      FROM "Operator" o
      WHERE o."isActive" = true
      ORDER BY replies7d DESC, active DESC
    `)) as Array<{ id: number; name: string; active: number; replies7d: number }>;

    const num = (v: number | null | undefined) => (v == null ? null : Math.round(Number(v)));

    return {
      open,
      unassigned,
      inWork,
      closedTotal,
      today: { created: createdToday, closed: closedToday },
      avgFirstResponseMin: num(avgFirst[0]?.m),
      avgResolutionMin: num(avgRes[0]?.m),
      perDay: perDay.map((r) => ({ date: r.d, count: Number(r.c) })),
      operators: operators.map((o) => ({
        id: o.id,
        name: o.name,
        active: Number(o.active),
        replies7d: Number(o.replies7d),
      })),
    };
  });
}
