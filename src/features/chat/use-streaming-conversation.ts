"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createPendingPresentation } from "./ai-response-model";
import type { ChatEntry } from "./chat-workspace";

const ACTIVITY_DELAYS = [760, 1_480, 2_230] as const;
const FIRST_TOKEN_DELAY = 2_980;
const STREAM_TICK = 58;

export function useStreamingConversation() {
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const scheduledHandles = useRef<Set<number>>(new Set());

  const updateEntry = useCallback((entryId: string, patch: Partial<ChatEntry>) => {
    setChatEntries((entries) => entries.map((entry) => (
      entry.id === entryId ? { ...entry, ...patch } : entry
    )));
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const handle = window.setTimeout(() => {
      scheduledHandles.current.delete(handle);
      callback();
    }, delay);
    scheduledHandles.current.add(handle);
  }, []);

  const clearScheduledWork = useCallback(() => {
    scheduledHandles.current.forEach((handle) => {
      window.clearTimeout(handle);
      window.clearInterval(handle);
    });
    scheduledHandles.current.clear();
  }, []);

  const addChatEntry = useCallback((prompt: string) => {
    const entryId = `message-${Date.now()}-${crypto.randomUUID()}`;
    const entry: ChatEntry = {
      id: entryId,
      prompt,
      sentAt: new Date().toISOString(),
      response: createPendingPresentation(prompt),
      agentState: "understanding",
      lifecycle: {
        phase: "loading",
        progress: 0,
        activeStep: 0,
      },
      transportMode: "preview",
    };

    setChatEntries((entries) => [...entries, entry]);

    ACTIVITY_DELAYS.forEach((delay, index) => {
      schedule(() => {
        updateEntry(entryId, {
          agentState: index === 0 ? "understanding" : index === 1 ? "retrieving" : "generating",
          lifecycle: {
            phase: "loading",
            progress: 0,
            activeStep: index + 1,
          },
        });
      }, delay);
    });

    schedule(() => {
      let tick = 0;
      let progress = 0;

      updateEntry(entryId, {
        agentState: "generating",
        lifecycle: { phase: "streaming", progress: 0.01, activeStep: 4 },
      });

      const streamHandle = window.setInterval(() => {
        tick += 1;
        const cadence = 0.014 + Math.pow(Math.sin(tick * 0.82), 2) * 0.01;
        progress = Math.min(1, progress + cadence);

        if (progress >= 1) {
          window.clearInterval(streamHandle);
          scheduledHandles.current.delete(streamHandle);
          updateEntry(entryId, {
            outcomeStatus: "completed",
            lifecycle: { phase: "complete", progress: 1, activeStep: 4 },
          });
          return;
        }

        updateEntry(entryId, {
          lifecycle: { phase: "streaming", progress, activeStep: 4 },
        });
      }, STREAM_TICK);

      scheduledHandles.current.add(streamHandle);
    }, FIRST_TOKEN_DELAY);
  }, [schedule, updateEntry]);

  const resetConversation = useCallback(() => {
    clearScheduledWork();
    setChatEntries([]);
  }, [clearScheduledWork]);

  const cancelGeneration = useCallback(() => {
    clearScheduledWork();
    setChatEntries((entries) => entries.map((entry, index) => (
      index === entries.length - 1 && entry.lifecycle?.phase !== "complete"
        ? {
            ...entry,
            outcomeStatus: "cancelled",
            cancelled: true,
            lifecycle: {
              phase: "complete",
              progress: 1,
              activeStep: entry.lifecycle?.activeStep ?? 0,
            },
          }
        : entry
    )));
  }, [clearScheduledWork]);

  useEffect(() => () => clearScheduledWork(), [clearScheduledWork]);

  const busy = chatEntries.at(-1)?.lifecycle?.phase === "loading" || chatEntries.at(-1)?.lifecycle?.phase === "streaming";

  return { chatEntries, addChatEntry, cancelGeneration, resetConversation, busy };
}
