import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { config } from '../../config.js';
import { saveSubscription, removeSubscription } from '../../services/push.js';

const subSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }),
});

const unsubSchema = z.object({ endpoint: z.string() });

export async function pushRoutes(app: FastifyInstance) {
  // Public key is needed by the browser to create a subscription.
  app.get('/api/push/vapid', { preHandler: requireAuth }, async () => ({
    publicKey: config.push.publicKey,
    enabled: config.push.enabled,
  }));

  app.post('/api/push/subscribe', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = subSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid subscription' });
    await saveSubscription(req.operator!.sub, parsed.data.subscription);
    return { ok: true };
  });

  app.post('/api/push/unsubscribe', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = unsubSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });
    await removeSubscription(parsed.data.endpoint);
    return { ok: true };
  });
}
