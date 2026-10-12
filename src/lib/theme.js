// lib/theme.js
// Theme helpers. The light/dark choice is saved in the browser (no backend involved).
// The theme only applies inside /app (see ThemeScope in App.jsx).

const THEME_KEY = 'anchor-theme'; // 'system' | 'light' | 'dark'

// Browser-bar colours, keep in sync with --bg-main in index.css and the script in index.html
const BAR_COLORS = { light: '#FAF8F4', dark: '#0F1B2D' };

export const THEME_OPTIONS = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export const getThemePreference = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch (e) {
    return 'system';
  }
};

// 'system' follows the phone's light/dark setting
export const resolveTheme = (preference = getThemePreference()) => {
  if (preference === 'light' || preference === 'dark') return preference;
  const prefersLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
};

const setBarColor = (theme) => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BAR_COLORS[theme]);
};

export const applyTheme = () => {
  const theme = resolveTheme();
  document.documentElement.setAttribute('data-theme', theme);
  setBarColor(theme);
};

// Called when leaving /app, so the landing page and sign-in go back to their normal look
export const clearTheme = () => {
  document.documentElement.removeAttribute('data-theme');
  setBarColor('dark');
};

export const setThemePreference = (preference) => {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch (e) {
    // Storage unavailable: the choice applies for this visit but will not be remembered
  }
  applyTheme();
};

// Re-applies the theme when the phone switches between light and dark (only matters for 'system')
export const watchSystemTheme = (onChange) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia('(prefers-color-scheme: light)');
  if (!query.addEventListener) return () => {};
  const handler = () => {
    if (getThemePreference() === 'system') onChange();
  };
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
};