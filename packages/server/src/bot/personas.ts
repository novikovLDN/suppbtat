/**
 * Customer-facing operator personas. The real operator/admin stays anonymous to
 * the user — when a chat is taken into work we show one of these names instead.
 */
export const OPERATOR_PERSONAS = [
  'Александр',
  'Мария',
  'Иван',
  'Максим',
  'Старший специалист Артём',
  'Ведущий разработчик Михаил',
];

export function randomPersona(): string {
  return OPERATOR_PERSONAS[Math.floor(Math.random() * OPERATOR_PERSONAS.length)];
}

export function isValidPersona(name: string): boolean {
  return OPERATOR_PERSONAS.includes(name);
}
