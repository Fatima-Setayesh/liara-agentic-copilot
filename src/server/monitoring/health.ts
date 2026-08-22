import { loadAIConfig } from "@/server/ai";
import { loadChatRuntimeConfig } from "@/server/chat/config";
import { loadRuntimeRetrievalConfig } from "@/server/retrieval";

export type HealthCheckState = "ok" | "error";

export interface ApplicationHealth {
  readonly status: "ok" | "degraded";
  readonly checks: {
    readonly aiConfiguration: HealthCheckState;
    readonly chatConfiguration: HealthCheckState;
    readonly retrievalConfiguration: HealthCheckState;
  };
}

export interface HealthCheckDependencies {
  readonly checkAIConfiguration: () => void;
  readonly checkChatConfiguration: () => void;
  readonly checkRetrievalConfiguration: () => void;
}

const defaultDependencies: HealthCheckDependencies = {
  checkAIConfiguration: () => {
    loadAIConfig();
  },
  checkChatConfiguration: () => {
    loadChatRuntimeConfig();
  },
  checkRetrievalConfiguration: () => {
    loadRuntimeRetrievalConfig();
  },
};

function runCheck(check: () => void): HealthCheckState {
  try {
    check();
    return "ok";
  } catch {
    return "error";
  }
}

export function checkApplicationHealth(
  dependencies: HealthCheckDependencies = defaultDependencies,
): ApplicationHealth {
  const checks = Object.freeze({
    aiConfiguration: runCheck(dependencies.checkAIConfiguration),
    chatConfiguration: runCheck(dependencies.checkChatConfiguration),
    retrievalConfiguration: runCheck(dependencies.checkRetrievalConfiguration),
  });
  const healthy = Object.values(checks).every((state) => state === "ok");

  return Object.freeze({
    status: healthy ? "ok" : "degraded",
    checks,
  });
}
