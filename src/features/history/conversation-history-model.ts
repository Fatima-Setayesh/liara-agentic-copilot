import { z } from "zod";

export const conversationRecordSchema = z.strictObject({
  id: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(80),
  updatedAt: z.string().datetime(),
  pinned: z.boolean(),
  archived: z.boolean(),
});

const conversationHistorySchema = z.array(conversationRecordSchema).max(200);

export type ConversationRecord = z.infer<typeof conversationRecordSchema>;
export type ConversationFilter = "all" | "pinned" | "archived";
export type ConversationGroup = {
  label: "Today" | "Yesterday" | "Older";
  items: ConversationRecord[];
};

function atLocalTime(base: Date, dayOffset: number, hour: number, minute: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function createSeedConversationHistory(now = new Date()): ConversationRecord[] {
  return [
    { id: "history-next-deploy", title: "Fix Next.js deployment issue", updatedAt: atLocalTime(now, 0, 10, 42), pinned: true, archived: false },
    { id: "history-postgres", title: "Database connection problem", updatedAt: atLocalTime(now, 0, 9, 15), pinned: false, archived: false },
    { id: "history-docker", title: "Docker build failure", updatedAt: atLocalTime(now, -1, 16, 8), pinned: false, archived: false },
    { id: "history-environment", title: "Environment configuration", updatedAt: atLocalTime(now, -1, 13, 21), pinned: false, archived: false },
    { id: "history-domain", title: "Configure custom domain", updatedAt: atLocalTime(now, -4, 11, 48), pinned: false, archived: false },
    { id: "history-timeout", title: "Debug API timeout", updatedAt: atLocalTime(now, -8, 15, 30), pinned: false, archived: false },
    { id: "history-variables", title: "Environment variables setup", updatedAt: atLocalTime(now, -18, 12, 5), pinned: false, archived: true },
  ];
}

export function parseStoredConversationHistory(value: string | null): ConversationRecord[] | null {
  if (!value) return null;

  try {
    const result = conversationHistorySchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
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
