import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { authRoutes } from './routes/auth.js';
import { ticketRoutes } from './routes/tickets.js';
import { operatorRoutes } from './routes/operators.js';
import { mediaRoutes } from './routes/media.js';
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

  await app.register(authRoutes);
  await app.register(ticketRoutes);
  await app.register(operatorRoutes);
  await app.register(mediaRoutes);
  await app.register(websocketRoutes);

  // Serve the built dashboard (single-service deploy) with SPA fallback.
  if (fs.existsSync(dashboardDist)) {
    await app.register(fastifyStatic, { root: dashboardDist, prefix: '/' });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
    logger.info(`Serving dashboard from ${dashboardDist}`);
  } else {
    logger.warn(`Dashboard build not found at ${dashboardDist} (run "npm run build:dashboard")`);
  }

  return app;
}
