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

    // Created vs resolved per day over the last 14 days (dense series incl. zeros).
    const perDay = (await prisma.$queryRawUnsafe(`
      SELECT to_char(d, 'YYYY-MM-DD') AS date,
        (SELECT count(*)::int FROM "Ticket" t WHERE date_trunc('day', t."createdAt") = d) AS created,
        (SELECT count(*)::int FROM "Ticket" t WHERE t.status = 'CLOSED' AND date_trunc('day', t."closedAt") = d) AS closed
      FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      ORDER BY d
    `)) as Array<{ date: string; created: number; closed: number }>;

    const operators = (await prisma.$queryRawUnsafe(`
      SELECT o.id, o."displayName" AS name,
        (SELECT count(*)::int FROM "Ticket" t WHERE t."assignedOperatorId" = o.id AND t.status = 'OPEN') AS active,
        (SELECT count(*)::int FROM "Message" m WHERE m."operatorId" = o.id AND m.sender = 'OPERATOR'
           AND m.internal = false AND m."createdAt" >= now() - interval '7 days') AS replies7d,
        (SELECT avg(t.rating) FROM "Ticket" t WHERE t."assignedOperatorId" = o.id AND t.rating IS NOT NULL) AS avg_rating,
        (SELECT count(*)::int FROM "Ticket" t WHERE t."assignedOperatorId" = o.id AND t.rating IS NOT NULL) AS ratings
      FROM "Operator" o
      WHERE o."isActive" = true
      ORDER BY replies7d DESC, active DESC
    `)) as Array<{ id: number; name: string; active: number; replies7d: number; avg_rating: number | null; ratings: number }>;

    const ratingAgg = (await prisma.$queryRawUnsafe(`
      SELECT avg(rating) AS avg, count(*)::int AS cnt FROM "Ticket" WHERE rating IS NOT NULL
    `)) as Array<{ avg: number | null; cnt: number }>;

    const num = (v: number | null | undefined) => (v == null ? null : Math.round(Number(v)));
    const num1 = (v: number | null | undefined) => (v == null ? null : Math.round(Number(v) * 10) / 10);

    return {
      open,
      unassigned,
      inWork,
      closedTotal,
      today: { created: createdToday, closed: closedToday },
      avgFirstResponseMin: num(avgFirst[0]?.m),
      avgResolutionMin: num(avgRes[0]?.m),
      avgRating: num1(ratingAgg[0]?.avg),
      ratingsCount: Number(ratingAgg[0]?.cnt ?? 0),
      perDay: perDay.map((r) => ({
        date: r.date,
        created: Number(r.created),
        closed: Number(r.closed),
      })),
      operators: operators.map((o) => ({
        id: o.id,
        name: o.name,
        active: Number(o.active),
        replies7d: Number(o.replies7d),
        avgRating: num1(o.avg_rating),
        ratings: Number(o.ratings),
      })),
    };
  });
}
