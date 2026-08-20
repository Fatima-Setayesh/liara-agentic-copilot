"use client";

import { Archive, MessageSquareDashed, Pin, SearchX, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { ConversationItem } from "./conversation-item";
import {
  filterConversations,
  groupConversations,
  type ConversationFilter,
  type ConversationRecord,
} from "./conversation-history-model";
import { ConversationSearch } from "./conversation-search";
import styles from "./conversation-history.module.css";

type ConversationHistoryProps = {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onTogglePin: (id: string) => void;
};

const historyFilters: Array<{ value: ConversationFilter; label: string; icon?: typeof Pin }> = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned", icon: Pin },
  { value: "archived", label: "Archived", icon: Archive },
];

function HistoryLoadingState() {
  return (
    <div className={styles.historyLoading} role="status" aria-label="Loading conversation history">
      {["76%", "91%", "63%", "84%"].map((width, index) => (
        <span style={{ "--history-line": width, "--history-delay": `${index * 95}ms` } as React.CSSProperties} key={width}>
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}

export function ConversationHistory({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onRename,
  onDelete,
  onToggleArchive,
  onTogglePin,
}: ConversationHistoryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const visibleConversations = useMemo(
    () => filterConversations(conversations, query, filter),
    [conversations, filter, query],
  );
  const groupedConversations = useMemo(
    () => groupConversations(visibleConversations),
    [visibleConversations],
  );

  return (
    <div className={styles.historyRoot}>
      <ConversationSearch value={query} onChange={setQuery} />

      <div className={styles.historyFilters} aria-label="Conversation filters">
        {historyFilters.map(({ value, label, icon: Icon }) => (
          <button
            type="button"
            data-active={filter === value || undefined}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            key={value}
          >
            {Icon && <Icon size={11} aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>

      <div className={styles.historyScroll} tabIndex={0} aria-label="Conversation history list">
        {loading ? (
          <HistoryLoadingState />
        ) : groupedConversations.length > 0 ? (
          groupedConversations.map((group) => (
            <section className={styles.historyGroup} aria-labelledby={`history-${group.label.toLowerCase()}`} key={group.label}>
              <h3 id={`history-${group.label.toLowerCase()}`}>
                <Sparkles size={10} aria-hidden="true" />
                {group.label}
                <span>{group.items.length}</span>
              </h3>
              <div className={styles.historyGroupList}>
                {group.items.map((conversation) => (
                  <ConversationItem
                    conversation={conversation}
                    active={conversation.id === activeConversationId}
                    onSelect={() => onSelect(conversation.id)}
                    onRename={(title) => onRename(conversation.id, title)}
                    onDelete={() => onDelete(conversation.id)}
                    onToggleArchive={() => onToggleArchive(conversation.id)}
                    onTogglePin={() => onTogglePin(conversation.id)}
                    key={conversation.id}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className={styles.emptyHistory} role="status">
            <span aria-hidden="true">{query ? <SearchX size={19} /> : <MessageSquareDashed size={19} />}</span>
            <strong>{query ? "No conversations found" : filter === "archived" ? "No archived conversations" : "No conversations yet"}</strong>
            <p>{query ? "Try a different title or clear your search." : "Start a new conversation and it will appear here."}</p>
            {query && <button type="button" onClick={() => setQuery("")}>Clear search</button>}
          </div>
        )}
      </div>
    </div>
  );
}
