"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createConversationTitle,
  parseStoredConversationHistory,
  toPersistedChatEntries,
  type ConversationRecord,
} from "./conversation-history-model";
import type { ChatEntry } from "@/features/chat/chat-workspace";

const HISTORY_STORAGE_KEY = "liara-copilot-conversation-history-v1";
const ACTIVE_CONVERSATION_STORAGE_KEY = "liara-copilot-active-conversation-v1";
const HISTORY_READY_DELAY = 420;

export function useConversationHistory() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let storedConversations: ConversationRecord[] | null = null;
    let storedActiveConversationId: string | null = null;

    try {
      storedConversations = parseStoredConversationHistory(window.localStorage.getItem(HISTORY_STORAGE_KEY));
      storedActiveConversationId = window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    } catch {
      storedConversations = null;
    }

    const readyTimer = window.setTimeout(() => {
      setConversations(storedConversations ?? []);
      if (storedActiveConversationId && storedConversations?.some((conversation) => conversation.id === storedActiveConversationId)) {
        setActiveConversationId(storedActiveConversationId);
      }
      setIsLoading(false);
    }, HISTORY_READY_DELAY);

    return () => window.clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // History remains available for the current session when storage is unavailable.
    }
  }, [conversations, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    try {
      if (activeConversationId) window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId);
      else window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    } catch {
      // The active selection remains available for the current session.
    }
  }, [activeConversationId, isLoading]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const registerPrompt = useCallback((prompt: string) => {
    const timestamp = new Date().toISOString();

    if (activeConversationId && conversations.some((conversation) => conversation.id === activeConversationId)) {
      setConversations((items) => items.map((conversation) => (
        conversation.id === activeConversationId
          ? { ...conversation, updatedAt: timestamp, archived: false }
          : conversation
      )));
      return activeConversationId;
    }

    const id = `conversation-${crypto.randomUUID()}`;
    const conversation: ConversationRecord = {
      id,
      title: createConversationTitle(prompt),
      updatedAt: timestamp,
      pinned: false,
      archived: false,
      entries: [],
    };

    setConversations((items) => [conversation, ...items]);
    setActiveConversationId(id);
    return id;
  }, [activeConversationId, conversations]);

  const updateTranscript = useCallback((id: string, entries: ChatEntry[]) => {
    const persistedEntries = toPersistedChatEntries(entries);
    setConversations((items) => items.map((conversation) => (
      conversation.id === id
        ? { ...conversation, entries: persistedEntries, updatedAt: new Date().toISOString() }
        : conversation
    )));
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    const normalizedTitle = title.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!normalizedTitle) return;
    setConversations((items) => items.map((conversation) => (
      conversation.id === id ? { ...conversation, title: normalizedTitle } : conversation
    )));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((items) => items.filter((conversation) => conversation.id !== id));
    setActiveConversationId((current) => current === id ? null : current);
  }, []);

  const togglePinned = useCallback((id: string) => {
    setConversations((items) => items.map((conversation) => (
      conversation.id === id ? { ...conversation, pinned: !conversation.pinned } : conversation
    )));
  }, []);

  const toggleArchived = useCallback((id: string) => {
    setConversations((items) => items.map((conversation) => (
      conversation.id === id ? { ...conversation, archived: !conversation.archived } : conversation
    )));
    setActiveConversationId((current) => current === id ? null : current);
  }, []);

  return {
    conversations,
    activeConversationId,
    isLoading,
    startNewConversation,
    registerPrompt,
    selectConversation,
    renameConversation,
    deleteConversation,
    togglePinned,
    toggleArchived,
    updateTranscript,
  };
}
