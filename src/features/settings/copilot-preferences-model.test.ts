import { describe, expect, it } from "vitest";

import {
  defaultCopilotPreferences,
  normalizeUserContext,
  parseStoredCopilotPreferences,
} from "./copilot-preferences-model";

describe("copilot preferences", () => {
  it("accepts validated persisted preferences", () => {
    expect(parseStoredCopilotPreferences(JSON.stringify(defaultCopilotPreferences))).toEqual(defaultCopilotPreferences);
  });

  it("rejects malformed or unknown preference data", () => {
    expect(parseStoredCopilotPreferences('{"connectionMode":"unsafe"}')).toBeNull();
    expect(parseStoredCopilotPreferences("not-json")).toBeNull();
  });

  it("removes blank optional context fields", () => {
    expect(normalizeUserContext({ framework: "", answerDepth: "concise" })).toEqual({ answerDepth: "concise" });
  });
});
