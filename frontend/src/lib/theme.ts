export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "tripsync:theme:v1";
export const THEME_DARK_QUERY = "(prefers-color-scheme: dark)";

export const themeBootstrapScript = `
(function () {
  var saved = null;
  try { saved = localStorage.getItem('${THEME_STORAGE_KEY}'); } catch (_) {}
  var theme = saved === 'light' || saved === 'dark'
    ? saved
    : (window.matchMedia('${THEME_DARK_QUERY}').matches ? 'dark' : 'light');
  var root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
})();`;
