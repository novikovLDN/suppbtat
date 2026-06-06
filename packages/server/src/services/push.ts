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

export async function pushToAllOperators(payload: PushPayload) {
  if (!ready) return;
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 = subscription expired or unsubscribed -> clean it up.
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          logger.warn('push send failed', status);
        }
      }
    }),
  );
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
