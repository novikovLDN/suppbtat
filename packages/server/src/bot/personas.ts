/**
 * Customer-facing operator identities. The real operator/admin stays anonymous
 * to the user — when a chat is taken into work we show a "role + name" persona
 * (e.g. «Ведущий разработчик Михаил») instead.
 *
 * Keep OPERATOR_ROLES / OPERATOR_NAMES in sync with the dashboard copy in
 * packages/dashboard/src/lib/personas.ts.
 */

export const OPERATOR_ROLES = [
  'Специалист поддержки',
  'Старший специалист',
  'Ведущий специалист',
  'Разработчик',
  'Ведущий разработчик',
  'Инженер',
  'Ведущий инженер',
  'Старший инженер',
  'Инженер поддержки',
  'Сетевой инженер',
  'Специалист по безопасности',
  'Ведущий специалист по безопасности',
  'Руководитель поддержки',
  'Руководитель отдела разработки',
  'Технический директор',
];

export const OPERATOR_NAMES = [
  'Александр',
  'Мария',
  'Иван',
  'Максим',
  'Анна',
  'Дмитрий',
  'Ольга',
  'Павел',
  'Николай',
  'Сергей',
  'Владимир',
  'Роман',
  'Михаил',
  'Екатерина',
  'Алексей',
  'Артём',
];

/** Preset personas used for the random fallback. */
export const OPERATOR_PERSONAS = [
  'Специалист поддержки Ольга',
  'Старший специалист Артём',
  'Ведущий специалист Николай',
  'Ведущий разработчик Михаил',
  'Инженер поддержки Сергей',
  'Старший инженер Владимир',
  'Сетевой инженер Роман',
  'Руководитель поддержки Алексей',
];

export function composePersona(role: string, name: string): string {
  return `${role} ${name}`.replace(/\s+/g, ' ').trim();
}

export function randomPersona(): string {
  return OPERATOR_PERSONAS[Math.floor(Math.random() * OPERATOR_PERSONAS.length)];
}

/** Accept a preset persona, or any "role + name" built from the known lists. */
export function isValidPersona(name: string): boolean {
  const v = (name || '').trim();
  if (!v) return false;
  if (OPERATOR_PERSONAS.includes(v)) return true;
  const idx = v.lastIndexOf(' ');
  if (idx < 0) return false;
  const role = v.slice(0, idx).trim();
  const first = v.slice(idx + 1).trim();
  return OPERATOR_ROLES.includes(role) && OPERATOR_NAMES.includes(first);
}
