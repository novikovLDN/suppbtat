// Customer-facing operator identities (must match the server list in
// packages/server/src/bot/personas.ts).

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

/** Preset personas for the Settings default-name picker. */
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

const KEY = 'atlas_persona';

/** '' means "random" (server picks). */
export function getPersona(): string {
  return localStorage.getItem(KEY) || '';
}
export function setPersona(name: string) {
  if (name) localStorage.setItem(KEY, name);
  else localStorage.removeItem(KEY);
}
