# Atlas Secure — Support Bot + Operator Dashboard

Telegram support bot for **Atlas Secure** with a real-time operator dashboard.
Users open tickets in the bot (text + photos); operators handle them from a web
panel — claiming chats, replying live, sending images, and closing tickets.

Built to comfortably handle **1000–1500 concurrent chats** on a single instance.

```
┌────────────┐   long polling   ┌──────────────────────────────┐
│  Telegram  │ ───────────────▶ │  Node server (one process)   │
│   users    │ ◀─────────────── │  • grammY bot                │
└────────────┘                  │  • Fastify API + WebSocket   │
                                │  • serves the React panel    │
┌────────────┐    WS + REST     │            │                 │
│ operators  │ ◀──────────────▶ │            ▼                 │
│ (browser)  │                  │        PostgreSQL            │
└────────────┘                  └──────────────────────────────┘
```

## Features

**Bot (client side)** — mirrors the agreed flow:
- `/start` welcome with template + inline menu, `/help`, `/tickets`
- `/admin` — one-tap login to the dashboard for the configured admin Telegram id
- Ticket creation with display numbers (`#13102`), open/closed status
- "Мои тикеты" history, **"Дополнить тикет"** flow (once per ticket, with hints)
- Webhook on Railway / long polling locally — chosen automatically
- Photos / documents — both with a caption and standalone
- Working-hours notice ("Поддержка сейчас отдыхает")
- **Anti-ban protection:**
  - Silent unless the user explicitly started a request (button) or has an open ticket
  - Anti-flood rate limiting (20 msg/min per user)
  - Content moderation (drugs/weapons/fraud/CSAE/spam) before anything is relayed

**Dashboard (operator side):**
- Login (JWT). Bootstrap admin from env; admin manages operators
- Live ticket queue with filters: **Все / Новые / Мои / Закрытые** + counts
- Clear states: 🟡 Новый (не взят) · 🟢 В работе · 🔒 Закрыт
- One operator handles unlimited chats simultaneously
- Live chat (WebSocket), unread badges, search by `#number / name / @username`
- Reply with text + **send photos/files to the user**
- Claim / release / close / reopen; customer info panel

## Tech stack

Node.js + TypeScript · grammY · Fastify · WebSocket · Prisma · PostgreSQL ·
React + Vite + Tailwind. npm workspaces monorepo.

```
packages/server      bot + API + WebSocket (also serves the built dashboard)
packages/dashboard   React operator panel
prisma/              schema + migrations
```

## Local development

Requires Node 20+ and a PostgreSQL database.

```bash
# 1. install
npm install

# 2. database (any Postgres; docker-compose provided for convenience)
docker compose up -d db

# 3. env
cp .env.example .env       # set BOT_TOKEN, JWT_SECRET, ADMIN_PASSWORD, DATABASE_URL

# 4. schema
npm run migrate:deploy     # or: npm run db:push

# 5a. dev (hot reload): API on :3000, Vite on :5173 (proxies /api + /ws)
npm run dev

# 5b. or production-style single service on :3000
npm run build
npm start
```

Open the dashboard at the Vite URL (dev) or `http://localhost:3000` (built).
Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`.

## Environment variables

See `.env.example`. Key ones:

| Var | Description |
|-----|-------------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Long random string for session tokens |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Bootstrap admin (re-applied on each start) |
| `ADMIN_TELEGRAM_ID` | Telegram id allowed to use `/admin` one-tap login |
| `BOT_MODE` | `auto` (default) / `webhook` / `polling` |
| `PUBLIC_URL` | Public HTTPS URL (auto-derived on Railway) |
| `BRAND_NAME` | Branding shown to users (default `Atlas Secure`) |
| `WORK_HOURS_ENABLED` / `SUPPORT_TZ` / `WORK_HOURS_START` / `WORK_HOURS_END` | Working-hours notice |
| `TICKET_NUMBER_OFFSET` | Display numbers start near this value |
| `PORT` | HTTP port (Railway sets this automatically) |

## Deployment (Railway)

Deployed as **one service** + the managed **PostgreSQL** plugin. Build/start
commands and env vars are configured in the Railway UI (no extra config files
in the repo). See the project chat / `DEPLOY.md`-style notes for exact settings.

Summary:
- Add the **PostgreSQL** plugin → it provides `DATABASE_URL` automatically.
- Build command: `npm install && npm run build`
- Start command: `npx prisma migrate deploy && npm start`
- Set env vars: `BOT_TOKEN`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
  (+ optional branding / working-hours vars).

## Scaling notes

- Stateless HTTP + DB-backed tickets; indexes cover the queue/filter queries.
- Live updates go through an in-process event bus → WebSocket fan-out. To scale
  horizontally, replace the bus in `services/events.ts` with a Redis pub/sub
  adapter exposing the same `publish`/`subscribe` surface — nothing else changes.
