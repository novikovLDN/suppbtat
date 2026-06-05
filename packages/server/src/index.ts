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
  // bot.catch handles errors thrown inside update handlers (middleware), so a
  // single bad message never crashes the bot.
  bot.catch((err) => logger.error('Bot handler error', err.error));

  let botShuttingDown = false;

  // Supervised long polling: transient failures (network blips, or a 409 while
  // an old deployment is still shutting down) must NOT kill the bot. We log and
  // retry with backoff until polling succeeds or we're shutting down.
  const runBotSupervised = async () => {
    while (!botShuttingDown) {
      try {
        await bot.start({
          drop_pending_updates: false,
          onStart: (me) => logger.info(`Bot @${me.username} started (long polling)`),
        });
        break; // resolved because bot.stop() was called
      } catch (err) {
        if (botShuttingDown) break;
        const code = (err as { error_code?: number })?.error_code;
        if (code === 409) {
          logger.warn(
            'Bot polling conflict (409): another instance is using this BOT_TOKEN. ' +
              'Ensure only one service/replica runs. Retrying in 5s…',
          );
        } else {
          logger.error('Bot polling error, retrying in 5s', err);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  void runBotSupervised();

  // graceful shutdown — stop polling promptly so redeploys don't overlap.
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    botShuttingDown = true;
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
