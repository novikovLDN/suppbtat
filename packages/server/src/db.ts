import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

/**
 * BigInt values (Telegram ids, message ids) are not JSON-serializable by
 * default. Teach JSON how to render them as strings so API responses work.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
