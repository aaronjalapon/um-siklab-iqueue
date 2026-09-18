"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

type ThemeToggleProps = {
  variant?: "icon" | "menu";
  className?: string;
};

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, ready, toggleTheme } = useTheme();
  const target = theme === "dark" ? "light" : "dark";
  const label = ready ? `Switch to ${target} theme` : "Change color theme";
  const Icon = !ready ? SunMoon : theme === "dark" ? Sun : Moon;

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        aria-pressed={theme === "dark"}
        title={label}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary ${className}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
        <span>{ready && theme === "dark" ? "Light theme" : "Dark theme"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === "dark"}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-transparent text-current transition-colors duration-150 hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
