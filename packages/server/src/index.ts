import { config } from './config.js';
import { prisma } from './db.js';
import { logger } from './lib/logger.js';
import { ensureAdmin } from './bootstrap.js';
import { buildServer } from './api/server.js';
import { bot } from './bot/instance.js';
import { registerBotHandlers, setBotCommands } from './bot/handlers.js';

async function main() {
  logger.info(`Starting ${config.brand.name} support service (${config.nodeEnv})`);

  // 1. DB ready + bootstrap admin
  await prisma.$connect();
  await ensureAdmin();

  // 2. HTTP + WebSocket API (also serves the dashboard)
  registerBotHandlers();
  const app = await buildServer();
  await app.listen({ host: '0.0.0.0', port: config.port });
  logger.info(`HTTP server listening on :${config.port}`);

  // 3. Telegram bot (long polling)
  await setBotCommands().catch((e) => logger.warn('setMyCommands failed', e));
  bot.catch((err) => logger.error('Bot error', err));
  // start() resolves only when the bot stops; run it detached. A bad token or
  // transient Telegram error must not take the HTTP server down.
  bot
    .start({
      drop_pending_updates: false,
      onStart: (me) => logger.info(`Bot @${me.username} started (long polling)`),
    })
    .catch((e) => logger.error('Bot polling stopped', e));

  // graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    try {
      await bot.stop();
      await app.close();
      await prisma.$disconnect();
    } catch (e) {
      logger.error('Shutdown error', e);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
