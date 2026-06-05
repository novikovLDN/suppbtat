import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function opt(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null) return fallback;
  return v === 'true' || v === '1';
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  nodeEnv: opt('NODE_ENV', 'development'),
  isProd: opt('NODE_ENV', 'development') === 'production',
  port: int('PORT', 3000),

  botToken: req('BOT_TOKEN'),

  jwtSecret: req('JWT_SECRET'),

  admin: {
    username: opt('ADMIN_USERNAME', 'admin'),
    password: opt('ADMIN_PASSWORD', 'admin'),
    displayName: opt('ADMIN_DISPLAY_NAME', 'Administrator'),
    telegramId: process.env.ADMIN_TELEGRAM_ID || null,
  },

  brand: {
    name: opt('BRAND_NAME', 'Atlas Secure'),
    botUsername: process.env.SUPPORT_BOT_USERNAME || '',
  },

  workHours: {
    enabled: bool('WORK_HOURS_ENABLED', false),
    tz: opt('SUPPORT_TZ', 'Europe/Moscow'),
    start: opt('WORK_HOURS_START', '10:00'),
    end: opt('WORK_HOURS_END', '22:00'),
  },

  ticketNumberOffset: int('TICKET_NUMBER_OFFSET', 13000),
};

export type Config = typeof config;
