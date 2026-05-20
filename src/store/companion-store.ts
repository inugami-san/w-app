import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CompanionChatSummary, CompanionDayEntry, CompanionMessage } from '@/src/types/companion';
import { clampText, INPUT_LIMITS } from '@/src/utils/input-limits';

export const COMPANION_WELCOME_TEXT = 'Tell me what is on your mind. I can help you sort it into one clear next step.';

type CompanionStore = {
  entries: Record<string, CompanionDayEntry>;
  lastDailyReviewShownDateKey: string;
  hasHydrated: boolean;
  ensureDay: (dateKey: string) => void;
  addMessage: (dateKey: string, message: CompanionMessage) => void;
  addSummary: (input: {
    dateKey: string;
    title: string;
    body: string;
    messages: CompanionMessage[];
  }) => CompanionChatSummary;
  setDailyReviewShownDateKey: (dateKey: string) => void;
  clearCompanionData: () => void;
  setHasHydrated: (value: boolean) => void;
};

export function createCompanionMessage(role: CompanionMessage['role'], text: string): CompanionMessage {
  return {
    id: `message-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    role,
    text: clampText(text, INPUT_LIMITS.companionMessage).trim(),
    createdAt: new Date().toISOString(),
  };
}

function createSummaryId() {
  return `companion-summary-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createWelcomeMessage() {
  return createCompanionMessage('assistant', COMPANION_WELCOME_TEXT);
}

function ensureEntry(entries: Record<string, CompanionDayEntry>, dateKey: string): CompanionDayEntry {
  return entries[dateKey] ?? {
    dateKey,
    messages: [createWelcomeMessage()],
    summaries: [],
    updatedAt: new Date().toISOString(),
  };
}

export const useCompanionStore = create<CompanionStore>()(
  persist(
    (set) => ({
      entries: {},
      lastDailyReviewShownDateKey: '',
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      ensureDay: (dateKey) => {
        set((state) => {
          if (state.entries[dateKey]) return state;

          return {
            entries: {
              ...state.entries,
              [dateKey]: ensureEntry(state.entries, dateKey),
            },
          };
        });
      },

      addMessage: (dateKey, message) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                messages: [...entry.messages, message],
                updatedAt: nowIso,
              },
            },
          };
        });
      },

      addSummary: ({ dateKey, title, body, messages }) => {
        const nowIso = new Date().toISOString();
        const summary: CompanionChatSummary = {
          id: createSummaryId(),
          dateKey,
          title,
          body,
          messages,
          createdAt: nowIso,
        };

        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                summaries: [summary, ...entry.summaries],
                updatedAt: nowIso,
              },
            },
          };
        });

        return summary;
      },

      setDailyReviewShownDateKey: (dateKey) => {
        set({ lastDailyReviewShownDateKey: dateKey });
      },

      clearCompanionData: () => {
        set({
          entries: {},
          lastDailyReviewShownDateKey: '',
        });
      },
    }),
    {
      name: 'wenwen-companion-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        entries: state.entries,
        lastDailyReviewShownDateKey: state.lastDailyReviewShownDateKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
