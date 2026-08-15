import 'dotenv/config';
import crypto from 'node:crypto';

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

/** Coerce a VAPID subject into a valid mailto:/https: URL (Apple is strict). */
function normalizeVapidSubject(s: string): string {
  const v = (s || '').trim();
  if (/^(mailto:|https?:\/\/)/i.test(v)) return v;
  if (v.includes('@')) return `mailto:${v}`;
  if (v) return `https://${v.replace(/^\/+/, '')}`;
  return 'mailto:support@atlas-secure.app';
}

export const config = {
  nodeEnv: opt('NODE_ENV', 'development'),
  isProd: opt('NODE_ENV', 'development') === 'production',
  port: int('PORT', 3000),

  botToken: req('BOT_TOKEN'),

  bot: {
    // 'auto' (default) = webhook when a public URL is known, else long polling.
    mode: (opt('BOT_MODE', 'auto') as 'auto' | 'webhook' | 'polling'),
    // Public base URL of this service. Railway exposes RAILWAY_PUBLIC_DOMAIN.
    publicUrl: (
      process.env.PUBLIC_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '')
    ).replace(/\/+$/, ''),
    // Stable secret for the webhook path + Telegram secret_token header.
    webhookSecret:
      process.env.WEBHOOK_SECRET ||
      crypto.createHash('sha256').update(`${req('BOT_TOKEN')}:webhook`).digest('hex').slice(0, 40),
  },

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
    // The main product bot referenced in FAQ answers (payments, profile, etc.)
    mainBotUsername: (() => {
      const v = opt('MAIN_BOT_USERNAME', '@atlassecure_bot').trim();
      return v.startsWith('@') ? v : `@${v}`;
    })(),
  },

  workHours: {
    enabled: bool('WORK_HOURS_ENABLED', false),
    tz: opt('SUPPORT_TZ', 'Europe/Moscow'),
    start: opt('WORK_HOURS_START', '10:00'),
    end: opt('WORK_HOURS_END', '22:00'),
  },

  ticketNumberOffset: int('TICKET_NUMBER_OFFSET', 13000),

  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    // Apple Web Push requires a valid mailto: or https: subject — normalize
    // bare domains / emails so a misconfigured value doesn't cause 403s.
    subject: normalizeVapidSubject(opt('VAPID_SUBJECT', 'mailto:support@atlas-secure.app')),
    get enabled() {
      return Boolean(this.publicKey && this.privateKey);
    },
  },
};

export type Config = typeof config;

/** Resolve the effective bot transport based on config + environment. */
export function botMode(): 'webhook' | 'polling' {
  if (config.bot.mode === 'webhook') return 'webhook';
  if (config.bot.mode === 'polling') return 'polling';
  return config.bot.publicUrl ? 'webhook' : 'polling';
}

export function webhookPath(): string {
  return `/telegram/${config.bot.webhookSecret}`;
}

export function webhookUrl(): string {
  return `${config.bot.publicUrl}${webhookPath()}`;
}
