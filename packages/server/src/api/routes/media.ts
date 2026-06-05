import type { FastifyInstance } from 'fastify';
import { config } from '../../config.js';
import { bot } from '../../bot/instance.js';
import { requireAuth } from '../auth.js';
import { logger } from '../../lib/logger.js';

/**
 * Proxy Telegram media to the dashboard. The operator's browser never sees the
 * bot token: it requests /api/media/:fileId, we resolve the file path via the
 * Bot API and stream the bytes back.
 */
export async function mediaRoutes(app: FastifyInstance) {
  app.get('/api/media/:fileId', { preHandler: requireAuth }, async (req, reply) => {
    const fileId = (req.params as { fileId: string }).fileId;
    try {
      const file = await bot.api.getFile(fileId);
      if (!file.file_path) return reply.code(404).send({ error: 'No file path' });

      const url = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
      const res = await fetch(url);
      if (!res.ok || !res.body) return reply.code(502).send({ error: 'Upstream error' });

      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'private, max-age=86400');
      const arrayBuf = await res.arrayBuffer();
      return reply.send(Buffer.from(arrayBuf));
    } catch (err) {
      logger.warn('media proxy failed', err);
      return reply.code(404).send({ error: 'File unavailable' });
    }
  });
}
