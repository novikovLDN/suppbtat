import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { webhookCallback } from 'grammy';
import { config, botMode, webhookPath } from '../config.js';
import { bot } from '../bot/instance.js';
import { logger } from '../lib/logger.js';
import { authRoutes } from './routes/auth.js';
import { ticketRoutes } from './routes/tickets.js';
import { operatorRoutes } from './routes/operators.js';
import { mediaRoutes } from './routes/media.js';
import { pushRoutes } from './routes/push.js';
import { templateRoutes } from './routes/templates.js';
import { statsRoutes } from './routes/stats.js';
import { jiraRoutes } from './routes/jira.js';
import { websocketRoutes } from './ws.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/api -> packages/server/dist/api ; dashboard build at packages/dashboard/dist
const dashboardDist = path.resolve(__dirname, '../../../dashboard/dist');

export async function buildServer() {
  const app = Fastify({ bodyLimit: 15 * 1024 * 1024 }); // 15MB for image uploads

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  });
  await app.register(websocket);

  app.get('/api/health', async () => ({ ok: true, brand: config.brand.name }));
  app.get('/api/config', async () => ({ brand: config.brand.name }));

  // Telegram webhook endpoint (only in webhook mode). The path embeds a secret
  // and we additionally verify Telegram's secret_token header.
  if (botMode() === 'webhook') {
    app.post(
      webhookPath(),
      webhookCallback(bot, 'fastify', { secretToken: config.bot.webhookSecret }),
    );
    logger.info(`Webhook endpoint registered at ${webhookPath()}`);
  }

  await app.register(authRoutes);
  await app.register(ticketRoutes);
  await app.register(operatorRoutes);
  await app.register(mediaRoutes);
  await app.register(pushRoutes);
  await app.register(templateRoutes);
  await app.register(statsRoutes);
  await app.register(jiraRoutes);
  await app.register(websocketRoutes);

  // Serve the built dashboard (single-service deploy) with SPA fallback.
  if (fs.existsSync(dashboardDist)) {
    await app.register(fastifyStatic, {
      root: dashboardDist,
      prefix: '/',
      // Take full control of caching (the plugin's default is public,max-age=0).
      // Fingerprinted assets are immutable; the entry HTML / SW / manifest must
      // always revalidate so a new deploy reaches installed (iOS) PWAs at once.
      cacheControl: false,
      setHeaders: (res, pathName) => {
        if (/[\\/]assets[\\/]/.test(pathName)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(pathName)) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      // Never let the shell HTML be cached — it points at the current asset hashes.
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    });
    logger.info(`Serving dashboard from ${dashboardDist}`);
  } else {
    logger.warn(`Dashboard build not found at ${dashboardDist} (run "npm run build:dashboard")`);
  }

  return app;
}
