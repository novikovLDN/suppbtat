import { InlineKeyboard } from 'grammy';
import { ticketNumber } from '../services/serializers.js';

export interface ActiveTicketInfo {
  id: number;
  supplemented: boolean;
}

export function mainMenuKeyboard(active: ActiveTicketInfo | null): InlineKeyboard {
  const kb = new InlineKeyboard().text('🆘 Написать в поддержку', 'contact_support').row();
  if (active && !active.supplemented) {
    kb.text(`📝 Дополнить тикет #${ticketNumber(active.id)}`, 'supplement').row();
  }
  kb.text('📋 Мои тикеты', 'my_tickets').row();
  kb.text('❓ Помощь', 'help');
  return kb;
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('⬅️ В главное меню', 'back_to_menu');
}

export function ticketCreatedKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 Мои обращения', 'my_tickets')
    .row()
    .text('🔒 Закрыть тикет', 'close_ticket');
}

export function activeTicketKeyboard(active: ActiveTicketInfo): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (!active.supplemented) {
    kb.text(`📝 Дополнить тикет #${ticketNumber(active.id)}`, 'supplement').row();
  }
  kb.text('🔒 Закрыть тикет', 'close_ticket').row().text('⬅️ В главное меню', 'back_to_menu');
  return kb;
}
