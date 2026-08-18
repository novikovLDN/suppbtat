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
 * Ask the customer to rate the specialist after a ticket is closed. Best-effort;
 * sent on every close (repeat contacts included) unless this ticket already
 * carries a rating. Reopening a ticket clears its rating, so the next close
 * asks again.
 */
export async function sendRatingRequest(ticketId: number) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return;
  if (ticket.rating != null) return; // this ticket already carries a rating

  try {
    await bot.api.sendMessage(ticket.customer.id.toString(), t.ratePrompt, {
      parse_mode: 'HTML',
      reply_markup: ratingKeyboard(ticketId),
    });
  } catch (err) {
    logger.warn('rating request failed', err);
  }
}
