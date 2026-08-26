// Customer-facing operator identities (must match the server roster in
// packages/server/src/bot/personas.ts). Each role owns a distinct set of
// names, so persona combinations are always consistent.

export interface RoleTeam {
  role: string;
  names: string[];
}

export const OPERATOR_TEAM: RoleTeam[] = [
  { role: 'Специалист поддержки', names: ['Николай', 'Ольга', 'Артём', 'Полина'] },
  { role: 'Старший специалист', names: ['Виктория', 'Григорий', 'Тимур'] },
  { role: 'Ведущий специалист', names: ['Марина', 'Станислав', 'Валерия'] },
  { role: 'Разработчик', names: ['Кирилл', 'Денис', 'Егор', 'Ирина'] },
  { role: 'Ведущий разработчик', names: ['Михаил', 'Андрей', 'Павел'] },
  { role: 'Инженер', names: ['Роман', 'Антон', 'Глеб'] },
  { role: 'Ведущий инженер', names: ['Владислав', 'Юрий', 'Оксана'] },
  { role: 'Старший инженер', names: ['Владимир', 'Сергей', 'Илья'] },
  { role: 'Инженер поддержки', names: ['Максим', 'Даниил', 'Алина'] },
  { role: 'Сетевой инженер', names: ['Тарас', 'Борис', 'Руслан'] },
  { role: 'Специалист по безопасности', names: ['Виталий', 'Захар', 'Марк'] },
  { role: 'Ведущий специалист по безопасности', names: ['Леонид', 'Игорь', 'Арсений'] },
  { role: 'Руководитель поддержки', names: ['Алексей', 'Екатерина', 'Дмитрий'] },
  { role: 'Руководитель отдела разработки', names: ['Александр', 'Константин', 'Вячеслав'] },
  { role: 'Технический директор', names: ['Эдуард', 'Геннадий', 'Виктор'] },
];

export const OPERATOR_ROLES = OPERATOR_TEAM.map((t) => t.role);

export function namesForRole(role: string): string[] {
  return OPERATOR_TEAM.find((t) => t.role === role)?.names ?? [];
}

export function composePersona(role: string, name: string): string {
  return `${role} ${name}`.replace(/\s+/g, ' ').trim();
}

/** Preset personas (one per role) for the Settings default-name picker. */
export const OPERATOR_PERSONAS = OPERATOR_TEAM.map((t) => composePersona(t.role, t.names[0]));

const KEY = 'atlas_persona';

/** '' means "random" (server picks). */
export function getPersona(): string {
  return localStorage.getItem(KEY) || '';
}
export function setPersona(name: string) {
  if (name) localStorage.setItem(KEY, name);
  else localStorage.removeItem(KEY);
}
