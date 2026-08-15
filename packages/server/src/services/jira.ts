import { Prisma, JiraStatus, Sender } from '@prisma/client';
import { prisma } from '../db.js';
import { bus } from './events.js';
import { serializeJiraTask } from './serializers.js';

const jiraInclude = {
  ticket: { include: { customer: true } },
} satisfies Prisma.JiraTaskInclude;

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
}) {
  const { title, description } = await buildContext(input.ticketId);

  // Create, then stamp a human key derived from the auto-increment id.
  const created = await prisma.jiraTask.create({
    data: {
      key: '',
      ticketId: input.ticketId,
      title,
      description,
      comment: input.comment?.trim() || null,
      status: JiraStatus.WAITING,
      createdById: input.createdById,
      createdByName: input.createdByName,
    },
  });
  const task = await prisma.jiraTask.update({
    where: { id: created.id },
    data: { key: `JIRA-${created.id}` },
    include: jiraInclude,
  });

  bus.publish({ type: 'jira:new', task: serializeJiraTask(task) });
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

export async function deleteJiraTask(id: number) {
  await prisma.jiraTask.delete({ where: { id } }).catch(() => {});
}
