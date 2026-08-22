"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const ACCENT_THEMES = ["cyan", "violet", "blue", "orange", "white"] as const;

export type AccentTheme = (typeof ACCENT_THEMES)[number];

const ACCENT_THEME_STORAGE_KEY = "liara-copilot-accent-theme-v1";

export function isAccentTheme(value: string | null): value is AccentTheme {
  return ACCENT_THEMES.some((theme) => theme === value);
}

export function useAccentTheme() {
  const [theme, setTheme] = useState<AccentTheme>("cyan");
  const storageReadyRef = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(ACCENT_THEME_STORAGE_KEY);
        if (isAccentTheme(stored)) setTheme(stored);
      } catch {
        // The default cyan theme remains available when storage is unavailable.
      } finally {
        storageReadyRef.current = true;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReadyRef.current) return;

    try {
      window.localStorage.setItem(ACCENT_THEME_STORAGE_KEY, theme);
    } catch {
      // Theme selection remains available for the current session.
    }
  }, [theme]);

  const selectTheme = useCallback((nextTheme: AccentTheme) => setTheme(nextTheme), []);

  return { theme, selectTheme };
}
