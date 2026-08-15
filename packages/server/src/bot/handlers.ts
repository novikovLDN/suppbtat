import { Context, InlineKeyboard } from 'grammy';
import { bot } from './instance.js';
import { config } from '../config.js';
import { t, ticketStatusLabel } from './texts.js';
import { backToMenuKeyboard, ticketCreatedKeyboard, activeTicketKeyboard } from './keyboards.js';
import { FAQ, faqHomeKeyboard, faqCategoryKeyboard, faqAnswerKeyboard } from './faq.js';
import { isWithinWorkingHours } from './workhours.js';
import {
  upsertCustomer,
  findActiveTicket,
  getOrCreateActiveTicket,
  createTicket,
  listCustomerTickets,
  closeTicket,
} from '../services/tickets.js';
import { addCustomerMessage, addSystemMessage, type IncomingMedia } from '../services/messages.js';
import { pushToAllOperators } from '../services/push.js';
import { ticketNumber } from '../services/serializers.js';
import { signToken } from '../api/auth.js';
import { prisma } from '../db.js';
import { logger } from '../lib/logger.js';
import { setAwaiting, isAwaiting, clearAwaiting } from './session.js';
import { checkRate } from './antispam.js';
import { moderate, moderationMessage } from './moderation.js';

const HTML = { parse_mode: 'HTML' as const };

/* ─── Commands ─────────────────────────────────────────────── */

bot.command('start', async (ctx) => {
  await ctx.reply(t.welcome, { ...HTML, reply_markup: faqHomeKeyboard() });
});

bot.command('help', async (ctx) => {
  await ctx.reply(t.help, { ...HTML, reply_markup: backToMenuKeyboard() });
});

bot.command('tickets', async (ctx) => {
  await sendMyTickets(ctx);
});

/* ─── Admin one-tap login ──────────────────────────────────── */

bot.command('admin', async (ctx) => {
  const fromId = ctx.from?.id;
  // Silent for everyone except the configured admin Telegram id (anti-abuse).
  if (!fromId || !config.admin.telegramId || String(fromId) !== String(config.admin.telegramId)) {
    return;
  }
  // Mint a session token for the bootstrap admin operator account.
  const admin = await prisma.operator.findUnique({ where: { username: config.admin.username } });
  if (!admin) {
    await ctx.reply('⚠️ Учётная запись администратора не найдена. Проверьте ADMIN_USERNAME.');
    return;
  }
  const token = signToken({ sub: admin.id, username: admin.username, role: 'ADMIN', name: admin.displayName });
  const base = config.bot.publicUrl;
  if (base && base.startsWith('https://')) {
    const url = `${base}/?login=${encodeURIComponent(token)}`;
    await ctx.reply(t.adminPanel(url), {
      ...HTML,
      reply_markup: new InlineKeyboard().url('🖥 Открыть дашборд', url),
    });
  } else {
    await ctx.reply(t.adminPanelNoUrl(token), HTML);
  }
});

/* ─── Callback buttons ─────────────────────────────────────── */

const sendHome = async (ctx: Context) => {
  await ctx.reply(t.welcome, { ...HTML, reply_markup: faqHomeKeyboard() });
};

bot.callbackQuery('back_to_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendHome(ctx);
});

// FAQ: back to topic list
bot.callbackQuery('faq:home', async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendHome(ctx);
});

// FAQ: open a category → list of questions
bot.callbackQuery(/^faq:c:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ci = Number(ctx.match[1]);
  const cat = FAQ[ci];
  if (!cat) return sendHome(ctx);
  await ctx.reply(`${cat.emoji} <b>${cat.title}</b> — выберите вопрос:`, {
    ...HTML,
    reply_markup: faqCategoryKeyboard(ci),
  });
});

// FAQ: show an answer
bot.callbackQuery(/^faq:q:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ci = Number(ctx.match[1]);
  const qi = Number(ctx.match[2]);
  const item = FAQ[ci]?.questions[qi];
  if (!item) return sendHome(ctx);
  await ctx.reply(`<b>${escapeHtml(item.q)}</b>\n\n${escapeHtml(item.a)}`, {
    ...HTML,
    reply_markup: faqAnswerKeyboard(ci, qi),
  });
});

// FAQ: "call operator" (with optional question context) → create a ticket now
bot.callbackQuery(/^faq:o:(\d+)(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ci = Number(ctx.match[1]);
  const qi = ctx.match[2] != null ? Number(ctx.match[2]) : null;
  const cat = FAQ[ci];
  const label = cat
    ? qi != null && cat.questions[qi]
      ? `${cat.title} → ${cat.questions[qi].q}`
      : cat.title
    : 'Обращение';
  await callOperator(ctx, label);
});

bot.callbackQuery('help', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(t.help, { ...HTML, reply_markup: backToMenuKeyboard() });
});

bot.callbackQuery('my_tickets', async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendMyTickets(ctx);
});

bot.callbackQuery('close_ticket', async (ctx) => {
  await ctx.answerCallbackQuery();
  const tgId = ctx.from?.id;
  const ticket = tgId ? await findActiveTicket(BigInt(tgId)) : null;
  if (!ticket) {
    await ctx.reply('У вас нет активного тикета.', { reply_markup: faqHomeKeyboard() });
    return;
  }
  await closeTicket(ticket.id);
  await addSystemMessage(ticket.id, 'Тикет закрыт пользователем.');
  await ctx.reply(t.ticketClosedByUser(ticket.id), { ...HTML, reply_markup: faqHomeKeyboard() });
});

/* ─── "My tickets" view ────────────────────────────────────── */

async function sendMyTickets(ctx: Context) {
  const tgId = ctx.from?.id;
  if (!tgId) return;
  const active = await findActiveTicket(BigInt(tgId));
  const all = await listCustomerTickets(BigInt(tgId), 10);

  let text = active ? t.ticketsHeaderActive(active.id) : t.ticketsHeaderEmpty;

  if (all.length) {
    text += `\n\n<b>История обращений:</b>`;
    for (const tk of all) {
      const date = tk.createdAt.toLocaleDateString('ru-RU');
      const subj = tk.subject ? ` — ${escapeHtml(tk.subject)}` : '';
      text += `\n${ticketStatusLabel(tk.status)} <b>#${ticketNumber(tk.id)}</b> · ${date}${subj}`;
    }
  }

  const kb = active ? activeTicketKeyboard() : faqHomeKeyboard();
  await ctx.reply(text, { ...HTML, reply_markup: kb });
}

/* ─── "Call operator" — creates a ticket immediately ───────── */

async function callOperator(ctx: Context, contextLabel: string) {
  if (!ctx.from) return;
  const userId = ctx.from.id;
  await upsertCustomer(ctx.from);
  // Accept the user's free-form messages from now on.
  setAwaiting(userId);

  const active = await findActiveTicket(BigInt(userId));
  if (active) {
    await ctx.reply(t.alreadyInSupport, { ...HTML, reply_markup: activeTicketKeyboard() });
    return;
  }

  const ticket = await createTicket(BigInt(userId), contextLabel);
  await addSystemMessage(ticket.id, `Клиент вызвал оператора из раздела «${contextLabel}».`);
  // Ping operators even before the customer types anything.
  pushToAllOperators({
    title: '🆘 Вызов оператора',
    body: `#${ticketNumber(ticket.id)} · ${contextLabel}`,
    ticketId: ticket.id,
  }).catch(() => {});

  await ctx.reply(t.operatorCalled, { ...HTML, reply_markup: ticketCreatedKeyboard() });
  if (!isWithinWorkingHours()) await ctx.reply(t.restingNotice, HTML);
}

/* ─── Incoming content (text / photo / document) ───────────── */

function extractMedia(ctx: Context): { media: IncomingMedia | null; text: string | null } {
  const msg = ctx.message;
  if (!msg) return { media: null, text: null };

  if (msg.photo?.length) {
    const largest = msg.photo[msg.photo.length - 1];
    return { media: { type: 'photo', fileId: largest.file_id }, text: msg.caption ?? null };
  }
  if (msg.document) {
    return {
      media: { type: 'document', fileId: msg.document.file_id, fileName: msg.document.file_name ?? null },
      text: msg.caption ?? null,
    };
  }
  if (msg.video) {
    return { media: { type: 'video', fileId: msg.video.file_id }, text: msg.caption ?? null };
  }
  if (msg.voice) {
    return { media: { type: 'voice', fileId: msg.voice.file_id }, text: msg.caption ?? null };
  }
  return { media: null, text: msg.text ?? null };
}

function subjectFrom(text: string | null, media: IncomingMedia | null): string | null {
  if (text) return text;
  if (media?.type === 'photo') return '📷 Фото';
  if (media?.type === 'document') return media.fileName ? `📎 ${media.fileName}` : '📎 Файл';
  if (media?.type === 'video') return '🎬 Видео';
  if (media?.type === 'voice') return '🎤 Голосовое сообщение';
  return null;
}

async function handleIncoming(ctx: Context) {
  if (!ctx.from || !ctx.message) return;

  // 1. Only operate in private chats; never auto-reply in groups/channels.
  if (ctx.chat?.type !== 'private') return;
  // Ignore other bots.
  if (ctx.from.is_bot) return;

  const userId = ctx.from.id;

  // 2. Anti-flood: drop excess messages, warn at most once per cooldown.
  const rate = checkRate(userId);
  if (rate.blocked) {
    if (rate.warn) {
      await ctx.reply('⏳ Слишком много сообщений подряд. Подождите минуту, пожалуйста.').catch(() => {});
    }
    return;
  }

  const { media, text } = extractMedia(ctx);
  if (!media && !text) return; // nothing storable

  // 3. Anti-ban gate: respond only to users who explicitly started a request
  //    (pressed a button) or already have an active ticket. Otherwise — silence.
  const active = await findActiveTicket(BigInt(userId));
  if (!active && !isAwaiting(userId)) {
    return; // stay completely silent
  }

  // 4. Content moderation — never relay clearly prohibited content.
  const verdict = moderate(text);
  if (!verdict.ok) {
    logger.warn(`Blocked message from ${userId}: ${verdict.reason}/${verdict.category ?? '-'}`);
    await ctx.reply(moderationMessage(verdict), HTML).catch(() => {});
    return;
  }

  try {
    await upsertCustomer(ctx.from);
    const subject = subjectFrom(text, media);
    const { ticket, created } = await getOrCreateActiveTicket(BigInt(userId), subject);

    await addCustomerMessage(ticket.id, {
      text,
      media,
      telegramMessageId: ctx.message.message_id,
    });

    // Intent consumed once a ticket exists; further messages append freely.
    clearAwaiting(userId);

    const resting = !isWithinWorkingHours();

    if (created) {
      await ctx.reply(t.ticketCreated(ticket.id), { ...HTML, reply_markup: ticketCreatedKeyboard() });
      if (resting) await ctx.reply(t.restingNotice, HTML);
    } else {
      await ctx.reply(t.appended(ticket.id), HTML);
    }
  } catch (err) {
    logger.error('handleIncoming failed', err);
    await ctx.reply('⚠️ Что-то пошло не так. Попробуйте ещё раз или нажмите /start.');
  }
}

bot.on('message:text', async (ctx) => {
  // commands are handled above; ignore anything starting with "/"
  if (ctx.message.text.startsWith('/')) return;
  await handleIncoming(ctx);
});

bot.on(['message:photo', 'message:document', 'message:video', 'message:voice'], handleIncoming);

/* ─── helpers ──────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function registerBotHandlers() {
  // side-effect import already registered everything above
  logger.info('Bot handlers registered');
}

export async function setBotCommands() {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Главное меню' },
    { command: 'tickets', description: 'Мои тикеты' },
    { command: 'help', description: 'Помощь' },
  ]);
}
