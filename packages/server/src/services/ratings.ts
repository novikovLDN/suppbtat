import { InlineKeyboard } from 'grammy';
import { bot } from '../bot/instance.js';
import { t } from '../bot/texts.js';
import { getTicketById } from './tickets.js';
import { logger } from '../lib/logger.js';

/** 5-star selector; each button carries the ticket id + star value. */
export function ratingKeyboard(ticketId: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 1; i <= 5; i++) kb.text('⭐', `rate:${ticketId}:${i}`);
  return kb;
}

/** Filled/empty star string for chat/system messages, e.g. ★★★★☆. */
export function starsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
}

/**
 * Ask the customer to rate the specialist after a ticket is closed. Best-effort:
 * only sent when an operator actually took the ticket into work and it isn't
 * already rated.
 */
export async function sendRatingRequest(ticketId: number) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return;
  if (ticket.rating != null) return; // already rated
  if (!ticket.claimNotified && ticket.assignedOperatorId == null) return; // nobody handled it

  try {
    await bot.api.sendMessage(ticket.customer.id.toString(), t.ratePrompt, {
      parse_mode: 'HTML',
      reply_markup: ratingKeyboard(ticketId),
    });
  } catch (err) {
    logger.warn('rating request failed', err);
  }
}
