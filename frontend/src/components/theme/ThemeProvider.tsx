"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  THEME_DARK_QUERY,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  ready: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

let transitionTimer: number | undefined;
const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function notifyThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function readDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
  if (animate) root.classList.add("theme-transition");
  else root.classList.remove("theme-transition");
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  const themeColor = theme === "dark" ? "#0B1220" : "#1A73E8";
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = themeColor;
  notifyThemeChange();

  if (animate) {
    transitionTimer = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      transitionTimer = undefined;
    }, 220);
  }
}

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme switching must still work when storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The root attribute is the single source of truth. The server snapshot keeps
  // hydration stable while the inline bootstrap applies the visual theme.
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readDocumentTheme,
    () => "light" as Theme
  );
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  useEffect(() => {
    const media = window.matchMedia(THEME_DARK_QUERY);
    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (readSavedTheme()) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next, false);
    };
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next, true);
    saveTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = readDocumentTheme();
    setTheme(current === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, ready, setTheme, toggleTheme }),
    [ready, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
