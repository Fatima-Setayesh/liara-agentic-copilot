"use client";

import { useCallback, useState } from "react";

import { createPendingPresentation } from "./ai-response-model";
import type { ChatEntry } from "./chat-workspace";

export function useStreamingConversation() {
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);

  const addChatEntry = useCallback((prompt: string) => {
    const entryId = `message-${Date.now()}-${crypto.randomUUID()}`;
    const entry: ChatEntry = {
      id: entryId,
      prompt,
      sentAt: new Date().toISOString(),
      response: createPendingPresentation(prompt),
      lifecycle: {
        phase: "complete",
        progress: 1,
        activeStep: -1,
      },
      transportMode: "preview",
    };

    setChatEntries((entries) => [...entries, entry]);
  }, []);

  const resetConversation = useCallback(() => {
    setChatEntries([]);
  }, []);

  const cancelGeneration = useCallback(() => {
    // Preview mode performs no request and therefore has nothing to cancel.
  }, []);

  return { chatEntries, addChatEntry, cancelGeneration, resetConversation, busy: false };
}
