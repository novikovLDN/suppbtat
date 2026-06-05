import { Role } from '@prisma/client';
import { prisma } from './db.js';
import { config } from './config.js';
import { hashPassword } from './api/auth.js';
import { logger } from './lib/logger.js';

/**
 * Ensure the bootstrap admin from env exists. Runs on every startup so the
 * operator can always log in with the credentials configured on Railway.
 */
export async function ensureAdmin() {
  const { username, password, displayName } = config.admin;
  const existing = await prisma.operator.findUnique({ where: { username } });

  if (!existing) {
    await prisma.operator.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        displayName,
        role: Role.ADMIN,
      },
    });
    logger.info(`Bootstrap admin "${username}" created`);
  } else {
    // keep password/role in sync with env (admin can rotate it via env)
    await prisma.operator.update({
      where: { username },
      data: {
        passwordHash: await hashPassword(password),
        role: Role.ADMIN,
        isActive: true,
        displayName,
      },
    });
    logger.info(`Bootstrap admin "${username}" verified`);
  }
}
