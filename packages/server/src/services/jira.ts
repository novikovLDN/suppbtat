import crypto from 'node:crypto';
import { Prisma, JiraStatus, Sender } from '@prisma/client';
import { prisma } from '../db.js';
import { bus } from './events.js';
import { serializeJiraTask } from './serializers.js';
import { notifyCustomer, addSystemMessage } from './messages.js';
import { t } from '../bot/texts.js';

const jiraInclude = {
  ticket: { include: { customer: true } },
} satisfies Prisma.JiraTaskInclude;

/**
 * A unique, human-friendly Jira key with a 4–7 digit number (e.g. "JIRA-48213").
 * Tries progressively wider ranges and checks the DB for collisions.
 */
async function generateUniqueKey(): Promise<string> {
  const ranges: Array<[number, number]> = [
    [1000, 9999], // 4 digits
    [10000, 99999], // 5
    [100000, 999999], // 6
    [1000000, 9999999], // 7
  ];
  for (let attempt = 0; attempt < 40; attempt++) {
    // widen the range as attempts grow so we don't exhaust small pools
    const [min, max] = ranges[Math.min(1 + Math.floor(attempt / 8), ranges.length - 1)];
    const n = crypto.randomInt(min, max + 1);
    const key = `JIRA-${n}`;
    const exists = await prisma.jiraTask.findUnique({ where: { key }, select: { id: true } });
    if (!exists) return key;
  }
  // Extremely unlikely fallback: timestamp-derived 7-digit number.
  return `JIRA-${(Date.now() % 9000000) + 1000000}`;
}

/**
 * Build a problem summary + description from the chat context: the earliest
 * customer messages carry the described problem.
 */
async function buildContext(ticketId: number): Promise<{ title: string; description: string | null }> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  const messages = await prisma.message.findMany({
    where: { ticketId, sender: Sender.CUSTOMER, text: { not: null } },
    orderBy: { createdAt: 'asc' },
    take: 5,
    select: { text: true },
  });
  const body = messages
    .map((m) => (m.text ?? '').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000);

  const firstLine = (body.split('\n')[0] || '').trim();
  const title =
    (ticket?.subject?.trim() || firstLine || 'Обращение в поддержку').slice(0, 120);

  return { title, description: body || null };
}

export async function createJiraTask(input: {
  ticketId: number;
  comment: string | null;
  createdById: number;
  createdByName: string;
  // When true, tell the customer (in Telegram) that a Jira task was raised.
  notifyCustomer?: boolean;
}) {
  const { title, description } = await buildContext(input.ticketId);

  const key = await generateUniqueKey();
  const task = await prisma.jiraTask.create({
    data: {
      key,
      ticketId: input.ticketId,
      title,
      description,
      comment: input.comment?.trim() || null,
      status: JiraStatus.WAITING,
      createdById: input.createdById,
      createdByName: input.createdByName,
    },
    include: jiraInclude,
  });

  bus.publish({ type: 'jira:new', task: serializeJiraTask(task) });

  // Note in the chat who raised it, and optionally notify the customer.
  await addSystemMessage(
    input.ticketId,
    `Создана задача ${task.key} (${input.createdByName})` +
      (input.notifyCustomer ? ' · клиент уведомлён.' : '.'),
  ).catch(() => {});
  if (input.notifyCustomer) {
    await notifyCustomer(input.ticketId, t.jiraCreatedForCustomer(task.key)).catch(() => {});
  }

  return task;
}

export async function listJiraTasks() {
  const tasks = await prisma.jiraTask.findMany({
    orderBy: { createdAt: 'desc' },
    include: jiraInclude,
  });
  return tasks.map(serializeJiraTask);
}

export async function getJiraTask(id: number) {
  return prisma.jiraTask.findUnique({ where: { id }, include: jiraInclude });
}

export async function updateJiraStatus(id: number, status: JiraStatus) {
  const task = await prisma.jiraTask.update({
    where: { id },
    data: { status },
    include: jiraInclude,
  });
  bus.publish({ type: 'jira:updated', task: serializeJiraTask(task) });
  return task;
}

/** Tell the customer their Jira task is done (best-effort) + record a system note. */
export async function notifyJiraDone(id: number, byName: string) {
  const task = await prisma.jiraTask.findUnique({ where: { id }, include: jiraInclude });
  if (!task) return null;
  await notifyCustomer(task.ticketId, t.jiraDoneForCustomer(task.key)).catch(() => {});
  await addSystemMessage(
    task.ticketId,
    `Клиент уведомлён о завершении задачи ${task.key} (${byName}).`,
  ).catch(() => {});
  return task;
}

export async function deleteJiraTask(id: number) {
  await prisma.jiraTask.delete({ where: { id } }).catch(() => {});
}
