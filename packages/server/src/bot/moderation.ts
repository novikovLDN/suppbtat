/**
 * Basic content moderation for incoming user messages.
 *
 * Goal: keep the bot from relaying clearly illegal content that could get the
 * Telegram account banned. This is a heuristic starter filter — extend the
 * pattern lists for your jurisdiction. It errs toward letting normal support
 * messages through and only blocks high-signal prohibited categories.
 */

const MAX_LENGTH = 4096;
const MAX_URLS = 6;

interface Rule {
  category: string;
  // word-boundary, case-insensitive, unicode
  patterns: RegExp[];
}

// NOTE: keep patterns specific to avoid false positives on legitimate support
// text. Each is intentionally narrow (combinations / clear intent to trade).
//
// Important: JavaScript's \b is ASCII-only and does NOT work around Cyrillic
// letters, so we use word *stems* + proximity (`[\s\S]{0,N}`) instead of \b for
// Russian. Matching runs on a lowercased copy of the text.
const RULES: Rule[] = [
  {
    category: 'csae', // child sexual abuse — zero tolerance
    patterns: [
      /(детск|малолет|child)[а-яё\w]*[\s\S]{0,15}(порн|porn|интим|nude)/iu,
      /\bcp\b[\s\S]{0,10}(видео|video|фото|photo|контент)/iu,
      /(педофил|pedophil|child\s*porn|csam)/iu,
    ],
  },
  {
    category: 'drugs',
    patterns: [
      /(купл|прода|закладк|сбыт|доставк|опт)[а-яё\w]*[\s\S]{0,40}(мефедрон|амфетамин|метамфетамин|героин|кокаин|гашиш|марихуан|меф\b|шишк|гидропон|спайс|мдма|lsd|лсд)/iu,
      /(мефедрон|амфетамин|героин|кокаин|гашиш|марихуан|шишк|спайс|мдма)[а-яё\w]*[\s\S]{0,40}(купл|прода|закладк|сбыт|цена|опт)/iu,
      /(mephedrone|cocaine|heroin|amphetamine|cannabis|weed)[\s\S]{0,40}(buy|sell|sale|price|for\s*sale)/iu,
    ],
  },
  {
    category: 'weapons',
    patterns: [
      /(купл|прода|сбыт|достав)[а-яё\w]*[\s\S]{0,40}(оружи|ствол|пистолет|автомат|взрывчатк|тротил|гранат)/iu,
      /(оружи|пистолет|взрывчатк|тротил|гранат)[а-яё\w]*[\s\S]{0,40}(купл|прода|цена|сбыт)/iu,
      /(buy|sell|for\s*sale)[\s\S]{0,40}(gun|firearm|explosive|grenade|\btnt\b)/iu,
    ],
  },
  {
    category: 'fraud',
    patterns: [
      /(залив|обнал|дроп|кардинг|вбив)[а-яё\w]*[\s\S]{0,30}(карт|счёт|счет|деньг|нал)/iu,
      /(краден|ворован|stolen)[а-яё\w]*[\s\S]{0,20}(карт|card|account|аккаунт)/iu,
      /(cvv|dump\b)[\s\S]{0,20}(sell|buy|прода|купл)/iu,
    ],
  },
  {
    category: 'extremism',
    patterns: [/(теракт|взорв[а-яё]*\s+(школ|вокзал|метро|здани)|terror\s*attack)/iu],
  },
];

export interface ModerationResult {
  ok: boolean;
  reason?: 'length' | 'spam' | 'banned';
  category?: string;
}

export function moderate(text: string | null): ModerationResult {
  if (!text) return { ok: true };

  if (text.length > MAX_LENGTH) {
    return { ok: false, reason: 'length' };
  }

  const urls = text.match(/https?:\/\/|t\.me\/|@[\w]{4,}/giu) ?? [];
  if (urls.length > MAX_URLS) {
    return { ok: false, reason: 'spam' };
  }

  const normalized = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(normalized))) {
      return { ok: false, reason: 'banned', category: rule.category };
    }
  }

  return { ok: true };
}

export function moderationMessage(result: ModerationResult): string {
  switch (result.reason) {
    case 'length':
      return '⚠️ Сообщение слишком длинное. Сократите его, пожалуйста, и отправьте снова.';
    case 'spam':
      return '⚠️ Сообщение похоже на спам (слишком много ссылок). Опишите проблему словами.';
    case 'banned':
      return (
        '🚫 Сообщение содержит запрещённый контент и не было передано в поддержку.\n' +
        'Пожалуйста, описывайте только вопросы, связанные с работой сервиса.'
      );
    default:
      return '⚠️ Сообщение не может быть обработано.';
  }
}
