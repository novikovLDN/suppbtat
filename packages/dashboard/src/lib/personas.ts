// Customer-facing operator personas (must match the server list).
export const OPERATOR_PERSONAS = [
  'Александр',
  'Мария',
  'Иван',
  'Максим',
  'Старший специалист Артём',
  'Ведущий разработчик Михаил',
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
