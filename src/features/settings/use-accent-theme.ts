"use client";

import { useCallback, useEffect, useState } from "react";

export type AccentTheme = "cyan" | "violet" | "blue" | "orange";

const ACCENT_THEME_STORAGE_KEY = "liara-copilot-accent-theme-v1";

export function useAccentTheme() {
  const [theme, setTheme] = useState<AccentTheme>("cyan");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACCENT_THEME_STORAGE_KEY);
      if (stored === "violet" || stored === "blue" || stored === "orange") setTheme(stored);
    } catch {
      // The default cyan theme remains available when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACCENT_THEME_STORAGE_KEY, theme);
    } catch {
      // Theme selection remains available for the current session.
    }
  }, [theme]);

  const selectTheme = useCallback((nextTheme: AccentTheme) => setTheme(nextTheme), []);

  return { theme, selectTheme };
}
