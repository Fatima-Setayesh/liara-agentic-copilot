import { z } from "zod";

import {
  agentStateSchema,
  chatErrorSchema,
  chatOutcomeStatusSchema,
  citationSchema,
  suggestionSchema,
} from "@/contracts";
import type { ChatEntry } from "@/features/chat/chat-workspace";

const persistedChatEntrySchema = z.object({
  id: z.string().min(1).max(128),
  prompt: z.string().trim().min(1).max(16_000),
  sentAt: z.string().datetime(),
  agentState: agentStateSchema.optional(),
  outcomeStatus: chatOutcomeStatusSchema.optional(),
  citations: z.array(citationSchema).max(24).optional(),
  suggestions: z.array(suggestionSchema).max(4).optional(),
  liveText: z.string().max(48_000).optional(),
  error: chatErrorSchema.optional(),
  cancelled: z.boolean().optional(),
  transportMode: z.enum(["preview", "live"]).optional(),
}).strip();

const persistedTranscriptSchema = z.array(persistedChatEntrySchema).max(100);

export const conversationRecordSchema = z.strictObject({
  id: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(80),
  updatedAt: z.string().datetime(),
  pinned: z.boolean(),
  archived: z.boolean(),
  entries: persistedTranscriptSchema,
});

const legacyConversationRecordSchema = conversationRecordSchema.omit({ entries: true });

const conversationHistorySchema = z.array(conversationRecordSchema).max(200);

export type ConversationRecord = z.infer<typeof conversationRecordSchema>;
export type ConversationFilter = "all" | "pinned" | "archived";
export type ConversationGroup = {
  label: "Today" | "Yesterday" | "Older";
  items: ConversationRecord[];
};

export function parseStoredConversationHistory(value: string | null): ConversationRecord[] | null {
  if (!value) return null;

  try {
    const raw = JSON.parse(value);
    const current = conversationHistorySchema.safeParse(raw);
    if (current.success) return current.data;

    const legacy = z.array(legacyConversationRecordSchema).max(200).safeParse(raw);
    return legacy.success ? legacy.data.map((conversation) => ({ ...conversation, entries: [] })) : null;
  } catch {
    return null;
  }
}

export function toPersistedChatEntries(entries: ChatEntry[]) {
  const result = persistedTranscriptSchema.safeParse(entries);
  return result.success ? result.data : [];
}

export function restoreChatEntries(entries: ConversationRecord["entries"]): ChatEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    prompt: entry.prompt,
    sentAt: entry.sentAt,
    ...(entry.agentState ? { agentState: entry.agentState } : {}),
    ...(entry.outcomeStatus ? { outcomeStatus: entry.outcomeStatus } : {}),
    ...(entry.citations ? { citations: entry.citations } : {}),
    ...(entry.suggestions ? { suggestions: entry.suggestions } : {}),
    ...(entry.liveText !== undefined ? { liveText: entry.liveText } : {}),
    ...(entry.error ? { error: entry.error } : {}),
    ...(entry.cancelled !== undefined ? { cancelled: entry.cancelled } : {}),
    ...(entry.transportMode ? { transportMode: entry.transportMode } : {}),
  }));
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function filterConversations(
  conversations: ConversationRecord[],
  searchQuery: string,
  filter: ConversationFilter,
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return conversations.filter((conversation) => {
    const matchesFilter = filter === "archived"
      ? conversation.archived
      : filter === "pinned"
        ? conversation.pinned && !conversation.archived
        : !conversation.archived;
    const matchesQuery = normalizedQuery.length === 0
      || conversation.title.toLocaleLowerCase().includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });
}

export function groupConversations(conversations: ConversationRecord[], now = new Date()): ConversationGroup[] {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = getDayKey(now);
  const yesterdayKey = getDayKey(yesterday);
  const grouped: Record<ConversationGroup["label"], ConversationRecord[]> = {
    Today: [],
    Yesterday: [],
    Older: [],
  };

  [...conversations]
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .forEach((conversation) => {
      const itemKey = getDayKey(new Date(conversation.updatedAt));
      const group = itemKey === todayKey ? "Today" : itemKey === yesterdayKey ? "Yesterday" : "Older";
      grouped[group].push(conversation);
    });

  return (["Today", "Yesterday", "Older"] as const)
    .map((label) => ({ label, items: grouped[label] }))
    .filter((group) => group.items.length > 0);
}

export function createConversationTitle(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  return normalized.length <= 48 ? normalized : `${normalized.slice(0, 47).trimEnd()}…`;
}
