export type Theme = 'light' | 'dark';

const KEY = 'atlas_theme';

export function getTheme(): Theme {
  const s = localStorage.getItem(KEY);
  return s === 'dark' ? 'dark' : 'light'; // premium light is the default
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', t === 'dark');
  root.style.colorScheme = t;
  // keep the iOS status-bar / PWA theme colour in sync
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#08090b' : '#f4f6f9');
}

export function setTheme(t: Theme) {
  localStorage.setItem(KEY, t);
  applyTheme(t);
}

export function initTheme() {
  applyTheme(getTheme());
}
