import { InlineKeyboard } from 'grammy';

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🆘 Написать в поддержку', 'contact_support')
    .row()
    .text('📋 Мои тикеты', 'my_tickets')
    .row()
    .text('❓ Помощь', 'help');
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

export function activeTicketKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔒 Закрыть тикет', 'close_ticket')
    .row()
    .text('⬅️ В главное меню', 'back_to_menu');
}
