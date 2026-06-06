import webpush from 'web-push';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { bus } from './events.js';
import type { SerializedTicket } from './events.js';
import { logger } from '../lib/logger.js';

function customerName(c: SerializedTicket['customer']): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return name || (c.username ? `@${c.username}` : `ID ${c.id}`);
}

let ready = false;

/** Configure web-push with VAPID keys. No-op if keys aren't set. */
export function initPush() {
  if (!config.push.enabled) {
    logger.warn('Web Push disabled (no VAPID keys). Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.');
    return;
  }
  webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey);
  ready = true;
  logger.info('Web Push enabled');

  // Immediate push to every subscribed operator when a new ticket appears.
  bus.subscribe((event) => {
    if (event.type !== 'ticket:new') return;
    const t = event.ticket;
    const who = customerName(t.customer);
    void pushToAllOperators({
      title: '🆘 Новый тикет',
      body: `#${t.number} · ${who}${t.subject ? ` — ${t.subject}` : ''}`,
      ticketId: t.id,
    });
  });
}

export interface PushPayload {
  title: string;
  body: string;
  ticketId?: number;
}

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

type Sub = { id: number; endpoint: string; p256dh: string; auth: string };

async function sendToSubs(subs: Sub[], payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  if (!ready || subs.length === 0) return result;
  const data = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
          { TTL: 120 },
        );
        result.sent++;
      } catch (err) {
        result.failed++;
        const e = err as { statusCode?: number; body?: string; message?: string };
        const host = (() => {
          try {
            return new URL(s.endpoint).host;
          } catch {
            return '?';
          }
        })();
        const detail = `${host} → ${e.statusCode ?? '?'} ${String(e.body || e.message || '').slice(0, 160)}`;
        result.errors.push(detail);
        logger.warn(`push send failed: ${detail}`);
        // 404/410 = expired/unsubscribed -> remove it.
        if (e.statusCode === 404 || e.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );
  return result;
}

export async function pushToAllOperators(payload: PushPayload): Promise<SendResult> {
  if (!ready) return { sent: 0, failed: 0, errors: ['push disabled (no VAPID keys)'] };
  const subs = await prisma.pushSubscription.findMany();
  logger.info(`push: ticket notification → ${subs.length} subscription(s)`);
  return sendToSubs(subs, payload);
}

export async function pushToOperator(operatorId: number, payload: PushPayload): Promise<SendResult> {
  if (!ready) return { sent: 0, failed: 0, errors: ['push disabled (no VAPID keys on server)'] };
  const subs = await prisma.pushSubscription.findMany({ where: { operatorId } });
  logger.info(`push: test → operator ${operatorId}, ${subs.length} subscription(s)`);
  return sendToSubs(subs, payload);
}

export async function saveSubscription(
  operatorId: number,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { operatorId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { operatorId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function operatorHasSubscription(operatorId: number): Promise<boolean> {
  const n = await prisma.pushSubscription.count({ where: { operatorId } });
  return n > 0;
}
