"use client";

import { MessageSquareText, Pin } from "lucide-react";
import { FormEvent, useState } from "react";

import { ConversationActions } from "./conversation-actions";
import type { ConversationRecord } from "./conversation-history-model";
import styles from "./conversation-history.module.css";

type ConversationItemProps = {
  conversation: ConversationRecord;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onToggleArchive: () => void;
  onTogglePin: () => void;
};

function formatConversationTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
  onToggleArchive,
  onTogglePin,
}: ConversationItemProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = draftTitle.trim();
    if (nextTitle) onRename(nextTitle);
    else setDraftTitle(conversation.title);
    setRenaming(false);
  }

  return (
    <div className={styles.conversationItem} data-active={active || undefined} data-pinned={conversation.pinned || undefined}>
      {renaming ? (
        <form className={styles.renameConversation} onSubmit={submitRename}>
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={(event) => event.currentTarget.form?.requestSubmit()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftTitle(conversation.title);
                setRenaming(false);
              }
            }}
            aria-label={`Rename ${conversation.title}`}
            maxLength={80}
            autoFocus
          />
        </form>
      ) : (
        <button
          type="button"
          className={styles.conversationSelect}
          onClick={onSelect}
          aria-current={active ? "page" : undefined}
        >
          <span className={styles.conversationIcon} aria-hidden="true"><MessageSquareText size={14} strokeWidth={1.75} /></span>
          <span className={styles.conversationCopy}>
            <strong>{conversation.title}</strong>
            <small>{formatConversationTime(conversation.updatedAt)}</small>
          </span>
          {conversation.pinned && <Pin className={styles.pinnedIcon} size={11} aria-label="Pinned" />}
        </button>
      )}

      {!renaming && (
        <ConversationActions
          conversation={conversation}
          onRename={() => setRenaming(true)}
          onDelete={onDelete}
          onToggleArchive={onToggleArchive}
          onTogglePin={onTogglePin}
        />
      )}
    </div>
  );
}
