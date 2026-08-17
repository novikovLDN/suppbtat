/**
 * Customer-facing operator personas. The real operator/admin stays anonymous to
 * the user — when a chat is taken into work we show one of these names instead.
 */
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

export function randomPersona(): string {
  return OPERATOR_PERSONAS[Math.floor(Math.random() * OPERATOR_PERSONAS.length)];
}

export function isValidPersona(name: string): boolean {
  return OPERATOR_PERSONAS.includes(name);
}
