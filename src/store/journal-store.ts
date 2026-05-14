import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  EvaluationFrequency,
  JournalEntry,
  JournalSummary,
  JournalTaskSnapshot,
  MoodKey,
} from '@/src/types/journal';

type JournalStore = {
  entries: Record<string, JournalEntry>;
  evaluationFrequency: EvaluationFrequency;
  setFeelingNote: (dateKey: string, note: string) => void;
  setMood: (dateKey: string, mood: MoodKey) => void;
  setTaskSnapshot: (dateKey: string, tasks: JournalTaskSnapshot[]) => void;
  addSummary: (input: {
    dateKey: string;
    title: string;
    body: string;
    tasks: JournalTaskSnapshot[];
    feelingNote: string;
    mood?: MoodKey;
  }) => JournalSummary;
  setEvaluationFrequency: (frequency: EvaluationFrequency) => void;
};

function createSummaryId() {
  return `summary-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function ensureEntry(entries: Record<string, JournalEntry>, dateKey: string): JournalEntry {
  return entries[dateKey] ?? {
    dateKey,
    feelingNote: '',
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

      addSummary: ({ dateKey, title, body, tasks, feelingNote, mood }) => {
        const nowIso = new Date().toISOString();
        const summary: JournalSummary = {
          id: createSummaryId(),
          dateKey,
          title,
          body,
          tasks,
          feelingNote,
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
    }),
    {
      name: 'wenwen-journal-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
