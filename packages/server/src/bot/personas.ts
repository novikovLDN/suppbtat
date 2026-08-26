/**
 * Customer-facing operator identities. Each role owns a distinct set of first
 * names (no overlap) so a given persona is always consistent — «Разработчик
 * Кирилл» is always a developer and «Кирилл» never shows up under another role.
 *
 * Keep this roster in sync with packages/dashboard/src/lib/personas.ts.
 */

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

export function randomPersona(): string {
  const team = OPERATOR_TEAM[Math.floor(Math.random() * OPERATOR_TEAM.length)];
  const name = team.names[Math.floor(Math.random() * team.names.length)];
  return composePersona(team.role, name);
}

/** Accept only a valid "role + name" where the name belongs to that role. */
export function isValidPersona(name: string): boolean {
  const v = (name || '').trim();
  if (!v) return false;
  const idx = v.lastIndexOf(' ');
  if (idx < 0) return false;
  const role = v.slice(0, idx).trim();
  const first = v.slice(idx + 1).trim();
  return namesForRole(role).includes(first);
}
