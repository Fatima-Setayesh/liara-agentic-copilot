"use client";

import { useCallback, useEffect, useState } from "react";

import type { UserContext } from "@/contracts";

import {
  defaultCopilotPreferences,
  normalizeUserContext,
  parseStoredCopilotPreferences,
  type ConnectionMode,
  type CopilotPreferences,
} from "./copilot-preferences-model";

const PREFERENCES_STORAGE_KEY = "liara-copilot-preferences-v1";

export function useCopilotPreferences() {
  const [preferences, setPreferences] = useState<CopilotPreferences>(defaultCopilotPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      let stored: CopilotPreferences | null = null;
      try {
        stored = parseStoredCopilotPreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
      } catch {
        stored = null;
      }

      setPreferences(stored ?? defaultCopilotPreferences);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences remain available in memory when browser storage is unavailable.
    }
  }, [hydrated, preferences]);

  const updateUserContext = useCallback((patch: Partial<UserContext>) => {
    setPreferences((current) => ({
      ...current,
      userContext: normalizeUserContext({ ...current.userContext, ...patch }),
    }));
  }, []);

  const setConnectionMode = useCallback((connectionMode: ConnectionMode) => {
    setPreferences((current) => ({ ...current, connectionMode }));
  }, []);

  const setSendOnEnter = useCallback((sendOnEnter: boolean) => {
    setPreferences((current) => ({ ...current, sendOnEnter }));
  }, []);

  const resetPreferences = useCallback(() => setPreferences(defaultCopilotPreferences), []);

  return {
    preferences,
    hydrated,
    updateUserContext,
    setConnectionMode,
    setSendOnEnter,
    resetPreferences,
  };
}
