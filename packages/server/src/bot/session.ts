/**
 * Lightweight per-user intent state, in memory.
 *
 * Anti-ban rule: the bot must NOT reply to free-form messages from a user who
 * hasn't explicitly started a conversation (pressed "Написать в поддержку" /
 * "Дополнить тикет") and has no active ticket. We track that explicit intent
 * here. It's ephemeral by design — a restart simply asks the user to tap the
 * button again, which is harmless.
 */

const AWAIT_TTL_MS = 30 * 60 * 1000; // intent is valid for 30 minutes

const awaiting = new Map<number, number>(); // userId -> expiry timestamp

export function setAwaiting(userId: number) {
  awaiting.set(userId, Date.now() + AWAIT_TTL_MS);
}

export function isAwaiting(userId: number): boolean {
  const exp = awaiting.get(userId);
  if (!exp) return false;
  if (exp < Date.now()) {
    awaiting.delete(userId);
    return false;
  }
  return true;
}

export function clearAwaiting(userId: number) {
  awaiting.delete(userId);
}

/* ─── "Дополнить тикет" one-shot mode ───────────────────────── */
// userId -> ticketId the next message should supplement.
const supplement = new Map<number, number>();

export function setSupplementMode(userId: number, ticketId: number) {
  supplement.set(userId, ticketId);
  setAwaiting(userId); // also open the message gate
}

export function getSupplementMode(userId: number): number | null {
  return supplement.get(userId) ?? null;
}

export function clearSupplementMode(userId: number) {
  supplement.delete(userId);
}

// periodic cleanup so the map can't grow unbounded under abuse
setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of awaiting) if (exp < now) awaiting.delete(id);
}, 5 * 60 * 1000).unref();
