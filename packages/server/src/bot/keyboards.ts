import { InlineKeyboard } from 'grammy';
import { ticketNumber } from '../services/serializers.js';

export function mainMenuKeyboard(activeTicketId: number | null): InlineKeyboard {
  const kb = new InlineKeyboard().text('🆘 Написать в поддержку', 'contact_support').row();
  if (activeTicketId) {
    kb.text(`📝 Дополнить тикет #${ticketNumber(activeTicketId)}`, 'supplement').row();
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

export function activeTicketKeyboard(ticketId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(`📝 Дополнить тикет #${ticketNumber(ticketId)}`, 'supplement')
    .row()
    .text('🔒 Закрыть тикет', 'close_ticket')
    .row()
    .text('⬅️ В главное меню', 'back_to_menu');
}
