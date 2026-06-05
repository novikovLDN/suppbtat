import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db.js';

export interface AuthPayload {
  sub: number; // operator id
  username: string;
  role: 'ADMIN' | 'OPERATOR';
  name: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function extractToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  // allow token via query for WebSocket upgrade
  const q = (req.query as Record<string, string> | undefined)?.token;
  return q ?? null;
}

declare module 'fastify' {
  interface FastifyRequest {
    operator?: AuthPayload;
  }
}

/** Fastify preHandler: require a valid operator session. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  // ensure the operator still exists and is active
  const op = await prisma.operator.findUnique({ where: { id: payload.sub } });
  if (!op || !op.isActive) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  req.operator = payload;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (req.operator?.role !== 'ADMIN') {
    reply.code(403).send({ error: 'Forbidden' });
  }
}
