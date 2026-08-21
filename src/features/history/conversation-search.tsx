import { Search, X } from "lucide-react";

import styles from "./conversation-history.module.css";

type ConversationSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ConversationSearch({ value, onChange }: ConversationSearchProps) {
  return (
    <div className={styles.conversationSearch} role="search">
      <Search size={14} strokeWidth={1.8} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search conversations..."
        aria-label="Search conversations"
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear conversation search">
          <X size={13} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
