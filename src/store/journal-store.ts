import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  EvaluationFrequency,
  JournalDailyContext,
  JournalEntry,
  JournalSummary,
  JournalTaskSnapshot,
  MoodKey,
} from '@/src/types/journal';

type JournalStore = {
  entries: Record<string, JournalEntry>;
  evaluationFrequency: EvaluationFrequency;
  lastDailyReviewShownDateKey: string;
  lastFeelingScaleShownDateKey: string;
  hasHydrated: boolean;
  setFeelingNote: (dateKey: string, note: string) => void;
  setFeelingScale: (dateKey: string, score: number | null) => void;
  setDailyContext: (dateKey: string, context: JournalDailyContext) => void;
  setMood: (dateKey: string, mood: MoodKey) => void;
  setTaskSnapshot: (dateKey: string, tasks: JournalTaskSnapshot[]) => void;
  addSummary: (input: {
    dateKey: string;
    title: string;
    body: string;
    tasks: JournalTaskSnapshot[];
    feelingNote: string;
    dailyContext?: JournalDailyContext;
    feelingScore?: number | null;
    mood?: MoodKey;
  }) => JournalSummary;
  setEvaluationFrequency: (frequency: EvaluationFrequency) => void;
  setDailyReviewShownDateKey: (dateKey: string) => void;
  setHasHydrated: (value: boolean) => void;
};

function createSummaryId() {
  return `summary-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function ensureEntry(entries: Record<string, JournalEntry>, dateKey: string): JournalEntry {
  return entries[dateKey] ?? {
    dateKey,
    feelingNote: '',
    dailyContext: {},
    updatedAt: new Date().toISOString(),
    tasks: [],
    summaries: [],
  };
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: {},
      evaluationFrequency: 'daily',
      lastDailyReviewShownDateKey: '',
      lastFeelingScaleShownDateKey: '',
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      setFeelingNote: (dateKey, note) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                feelingNote: note,
                updatedAt: nowIso,
              },
            },
          };
        });
      },

      setFeelingScale: (dateKey, score) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                feelingScale: {
                  score,
                  checkedAt: nowIso,
                },
                updatedAt: nowIso,
              },
            },
            lastFeelingScaleShownDateKey: dateKey,
          };
        });
      },

      setDailyContext: (dateKey, context) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                dailyContext: context,
                updatedAt: nowIso,
              },
            },
          };
        });
      },

      setMood: (dateKey, mood) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                mood,
                updatedAt: nowIso,
              },
            },
          };
        });
      },

      setTaskSnapshot: (dateKey, tasks) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                tasks,
                updatedAt: nowIso,
              },
            },
          };
        });
      },

      addSummary: ({ dateKey, title, body, tasks, feelingNote, dailyContext, feelingScore, mood }) => {
        const nowIso = new Date().toISOString();
        const summary: JournalSummary = {
          id: createSummaryId(),
          dateKey,
          title,
          body,
          tasks,
          feelingNote,
          dailyContext,
          feelingScore,
          mood,
          createdAt: nowIso,
        };

        set((state) => {
          const entry = ensureEntry(state.entries, dateKey);
          return {
            entries: {
              ...state.entries,
              [dateKey]: {
                ...entry,
                feelingNote,
                dailyContext: dailyContext ?? entry.dailyContext,
                feelingScale:
                  feelingScore === undefined
                    ? entry.feelingScale
                    : {
                        score: feelingScore,
                        checkedAt: entry.feelingScale?.checkedAt ?? nowIso,
                      },
                mood,
                tasks,
                updatedAt: nowIso,
                summaries: [summary, ...entry.summaries],
              },
            },
          };
        });

        return summary;
      },

      setEvaluationFrequency: (frequency) => {
        set({ evaluationFrequency: frequency });
      },

      setDailyReviewShownDateKey: (dateKey) => {
        set({ lastDailyReviewShownDateKey: dateKey });
      },
    }),
    {
      name: 'wenwen-journal-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        entries: state.entries,
        evaluationFrequency: state.evaluationFrequency,
        lastDailyReviewShownDateKey: state.lastDailyReviewShownDateKey,
        lastFeelingScaleShownDateKey: state.lastFeelingScaleShownDateKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
