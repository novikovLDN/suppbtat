/**
 * In-memory anti-flood rate limiter (sliding window per user).
 *
 * Protects the bot from being reported/banned for spammy automated replies:
 * a user can send at most MAX messages per WINDOW. Excess messages are dropped.
 * The very first time a user crosses the limit we allow one warning; after that
 * we stay silent until they cool down.
 */

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;

interface Bucket {
  hits: number[]; // timestamps within the window
  warned: boolean;
}

const buckets = new Map<number, Bucket>();

export interface ThrottleResult {
  blocked: boolean;
  /** true exactly once per cooldown — use it to send a single warning */
  warn: boolean;
}

export function checkRate(userId: number): ThrottleResult {
  const now = Date.now();
  let b = buckets.get(userId);
  if (!b) {
    b = { hits: [], warned: false };
    buckets.set(userId, b);
  }
  // drop timestamps outside the window
  b.hits = b.hits.filter((t) => now - t < WINDOW_MS);

  if (b.hits.length >= MAX_PER_WINDOW) {
    const warn = !b.warned;
    b.warned = true;
    return { blocked: true, warn };
  }

  b.hits.push(now);
  b.warned = false;
  return { blocked: false, warn: false };
}

setInterval(() => {
  const now = Date.now();
  for (const [id, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < WINDOW_MS);
    if (b.hits.length === 0) buckets.delete(id);
  }
}, 2 * 60 * 1000).unref();
