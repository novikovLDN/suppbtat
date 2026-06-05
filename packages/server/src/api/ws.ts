import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { verifyToken } from './auth.js';
import { bus, type AppEvent } from '../services/events.js';
import { prisma } from '../db.js';
import { logger } from '../lib/logger.js';

const clients = new Set<WebSocket>();

function broadcast(event: AppEvent) {
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

// Single subscription fans out to all connected operator sockets.
bus.subscribe(broadcast);

export async function websocketRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket, req) => {
    const token = (req.query as { token?: string }).token;
    const auth = token ? verifyToken(token) : null;
    if (!auth) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    clients.add(socket);
    logger.info(`WS connected: ${auth.username} (clients: ${clients.size})`);

    prisma.operator
      .update({ where: { id: auth.sub }, data: { lastSeenAt: new Date() } })
      .catch(() => {});

    socket.send(JSON.stringify({ type: 'ready', operator: { id: auth.sub, name: auth.name } }));

    // heartbeat to keep proxies (Railway) from dropping idle sockets
    const ping = setInterval(() => {
      if (socket.readyState === socket.OPEN) socket.ping();
    }, 25_000);

    socket.on('close', () => {
      clients.delete(socket);
      clearInterval(ping);
      logger.info(`WS disconnected: ${auth.username} (clients: ${clients.size})`);
    });

    socket.on('error', () => {
      clients.delete(socket);
      clearInterval(ping);
    });
  });
}
