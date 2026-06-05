import { Bot } from 'grammy';
import { config } from '../config.js';

/**
 * The single Bot instance, created here so both the handler module and the
 * message-delivery service can import it without a circular dependency.
 */
export const bot = new Bot(config.botToken);
