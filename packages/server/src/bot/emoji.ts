/**
 * Animated Telegram custom emoji support.
 *
 * Telegram renders <tg-emoji emoji-id="ID">fallback</tg-emoji> as an animated
 * custom emoji when the message is sent with parse_mode: 'HTML'. Premium users
 * (and users in chats where it's allowed) see the animation; everyone else sees
 * the fallback emoji — so it degrades gracefully.
 *
 * Provide ids either here, or via env CUSTOM_EMOJI_JSON, e.g.:
 *   CUSTOM_EMOJI_JSON={"wave":"5368324170671202286","shield":"5379748062124056162"}
 */
const fileRegistry: Record<string, string> = {
  // wave: '5368324170671202286',
  // shield: '5379748062124056162',
};

function loadRegistry(): Record<string, string> {
  let env: Record<string, string> = {};
  if (process.env.CUSTOM_EMOJI_JSON) {
    try {
      env = JSON.parse(process.env.CUSTOM_EMOJI_JSON);
    } catch {
      /* ignore malformed json */
    }
  }
  return { ...fileRegistry, ...env };
}

const registry = loadRegistry();

/** Wrap a fallback emoji in a custom-emoji tag if an id is configured. */
export function ce(name: string, fallback: string): string {
  const id = registry[name];
  return id ? `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>` : fallback;
}
