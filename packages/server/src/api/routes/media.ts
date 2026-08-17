import { Readable } from 'node:stream';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { config } from '../../config.js';
import { bot } from '../../bot/instance.js';
import { requireAuth } from '../auth.js';
import { logger } from '../../lib/logger.js';

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
};

/** Best content-type from the (dashboard-provided) name, else the Telegram path. */
function contentTypeFor(name: string | undefined, filePath: string, upstream: string | null): string {
  const ext = path.extname(name || filePath || '').toLowerCase();
  if (MIME[ext]) return MIME[ext];
  if (upstream && upstream !== 'application/octet-stream') return upstream;
  return 'application/octet-stream';
}

/**
 * Proxy Telegram media to the dashboard. The operator's browser never sees the
 * bot token: it requests /api/media/:fileId, we resolve the file path via the
 * Bot API and stream the bytes back — with a correct content-type, inline
 * disposition (so PDFs/video render in place) and HTTP Range support (so video
 * and audio can seek).
 */
export async function mediaRoutes(app: FastifyInstance) {
  app.get('/api/media/:fileId', { preHandler: requireAuth }, async (req, reply) => {
    const fileId = (req.params as { fileId: string }).fileId;
    const name = (req.query as { name?: string } | undefined)?.name;
    try {
      const file = await bot.api.getFile(fileId);
      if (!file.file_path) return reply.code(404).send({ error: 'No file path' });

      const url = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
      const range = req.headers.range;
      const upstream = await fetch(url, range ? { headers: { Range: range } } : {});
      if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
        return reply.code(502).send({ error: 'Upstream error' });
      }

      const type = contentTypeFor(name, file.file_path, upstream.headers.get('content-type'));
      reply.header('Content-Type', type);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Cache-Control', 'private, max-age=86400');
      // inline so browsers preview instead of forcing a download
      const disp = name
        ? `inline; filename*=UTF-8''${encodeURIComponent(name)}`
        : 'inline';
      reply.header('Content-Disposition', disp);

      const contentRange = upstream.headers.get('content-range');
      const contentLength = upstream.headers.get('content-length');
      if (contentRange) reply.header('Content-Range', contentRange);
      if (contentLength) reply.header('Content-Length', contentLength);
      reply.code(upstream.status === 206 ? 206 : 200);

      return reply.send(Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]));
    } catch (err) {
      logger.warn('media proxy failed', err);
      return reply.code(404).send({ error: 'File unavailable' });
    }
  });
}
