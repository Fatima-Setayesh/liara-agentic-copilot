import { describe, expect, it } from "vitest";

import {
  createConversationTitle,
  filterConversations,
  groupConversations,
  parseStoredConversationHistory,
  type ConversationRecord,
} from "./conversation-history-model";

const now = new Date("2026-08-20T12:00:00.000Z");
const conversations: ConversationRecord[] = [
  { id: "today", title: "Fix Next.js deployment", updatedAt: "2026-08-20T10:00:00.000Z", pinned: true, archived: false, entries: [] },
  { id: "yesterday", title: "Database connection", updatedAt: "2026-08-19T10:00:00.000Z", pinned: false, archived: false, entries: [] },
  { id: "older", title: "Docker build", updatedAt: "2026-08-10T10:00:00.000Z", pinned: false, archived: true, entries: [] },
];

describe("conversation history model", () => {
  it("groups visible conversations by time", () => {
    expect(groupConversations(conversations, now).map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Older",
    ]);
  });

  it("filters instantly by title and state", () => {
    expect(filterConversations(conversations, "next", "all").map((item) => item.id)).toEqual(["today"]);
    expect(filterConversations(conversations, "", "pinned").map((item) => item.id)).toEqual(["today"]);
    expect(filterConversations(conversations, "", "archived").map((item) => item.id)).toEqual(["older"]);
  });

  it("rejects malformed persisted history", () => {
    expect(parseStoredConversationHistory('{"not":"a history"}')).toBeNull();
    expect(parseStoredConversationHistory("not-json")).toBeNull();
  });

  it("migrates legacy metadata-only history to an empty transcript", () => {
    const legacy = JSON.stringify([{ id: "legacy", title: "Legacy chat", updatedAt: now.toISOString(), pinned: false, archived: false }]);
    expect(parseStoredConversationHistory(legacy)?.[0]?.entries).toEqual([]);
  });

  it("creates compact titles from submitted prompts", () => {
    expect(createConversationTitle("  Help   me deploy Next.js  ")).toBe("Help me deploy Next.js");
    expect(createConversationTitle("x".repeat(70))).toHaveLength(48);
  });
});
