"use client";

import { useEffect, useState } from "react";

export type ApplicationHealthState = "checking" | "ready" | "degraded";

const HEALTH_TIMEOUT_MS = 5_000;

export function useApplicationHealth(): ApplicationHealthState {
  const [state, setState] = useState<ApplicationHealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    let active = true;

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as { status?: unknown };
        if (active) {
          setState(response.ok && payload.status === "ok" ? "ready" : "degraded");
        }
      } catch {
        if (active) setState("degraded");
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkHealth();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return state;
}
