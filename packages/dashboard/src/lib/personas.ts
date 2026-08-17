// Customer-facing operator personas (must match the server list).
export const OPERATOR_PERSONAS = [
  // Friendly first touch — plain first names
  'Александр',
  'Мария',
  'Иван',
  'Максим',
  'Анна',
  'Дмитрий',
  // Support specialists
  'Специалист поддержки Ольга',
  'Специалист поддержки Павел',
  'Старший специалист Артём',
  'Старший специалист Екатерина',
  'Ведущий специалист Николай',
  // Engineering / escalation
  'Инженер поддержки Сергей',
  'Старший инженер Владимир',
  'Сетевой инженер Роман',
  'Ведущий разработчик Михаил',
  'Руководитель поддержки Алексей',
];

const KEY = 'atlas_persona';

/** '' means "random" (server picks). */
export function getPersona(): string {
  return localStorage.getItem(KEY) || '';
}
export function setPersona(name: string) {
  if (name) localStorage.setItem(KEY, name);
  else localStorage.removeItem(KEY);
}
