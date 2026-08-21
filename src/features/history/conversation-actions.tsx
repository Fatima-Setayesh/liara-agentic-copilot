"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { ConversationRecord } from "./conversation-history-model";
import styles from "./conversation-history.module.css";

type ConversationActionsProps = {
  conversation: ConversationRecord;
  onRename: () => void;
  onDelete: () => void;
  onToggleArchive: () => void;
  onTogglePin: () => void;
};

export function ConversationActions({
  conversation,
  onRename,
  onDelete,
  onToggleArchive,
  onTogglePin,
}: ConversationActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeMenu(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirmingDelete(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirmingDelete(false);
      }
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [open]);

  function moveMenuFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  function runAction(action: () => void) {
    action();
    setOpen(false);
    setConfirmingDelete(false);
  }

  return (
    <div className={styles.conversationActions} ref={containerRef}>
      <button
        type="button"
        className={styles.conversationMenuTrigger}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Actions for ${conversation.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <MoreHorizontal size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.conversationMenu} id={menuId} role="menu" ref={menuRef} onKeyDown={moveMenuFocus}>
          <button type="button" role="menuitem" onClick={() => runAction(onRename)}>
            <Pencil size={13} aria-hidden="true" /> Rename
          </button>
          <button type="button" role="menuitem" onClick={() => runAction(onTogglePin)}>
            {conversation.pinned ? <PinOff size={13} aria-hidden="true" /> : <Pin size={13} aria-hidden="true" />}
            {conversation.pinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" role="menuitem" onClick={() => runAction(onToggleArchive)}>
            {conversation.archived ? <ArchiveRestore size={13} aria-hidden="true" /> : <Archive size={13} aria-hidden="true" />}
            {conversation.archived ? "Restore" : "Archive"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.deleteConversationAction}
            data-confirming={confirmingDelete || undefined}
            onClick={() => {
              if (confirmingDelete) runAction(onDelete);
              else setConfirmingDelete(true);
            }}
          >
            <Trash2 size={13} aria-hidden="true" />
            {confirmingDelete ? "Confirm delete" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
