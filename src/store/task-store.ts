import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDefaultTasks } from '@/src/features/tasks/defaultTasks';
import type { TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';

type CreateTaskInput = {
  title: string;
  detail?: string;
  due?: string;
};

type TaskStore = {
  tasks: TaskItem[];
  lastDailyReset: string;
  hasHydrated: boolean;
  initializeTasks: () => void;
  addTask: (input: CreateTaskInput) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  resetDailyTasks: (force?: boolean) => void;
  setHasHydrated: (value: boolean) => void;
};

function makeTaskId() {
  return `task-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      lastDailyReset: '',
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      initializeTasks: () => {
        if (get().tasks.length > 0) return;

        const now = new Date();
        set({
          tasks: createDefaultTasks(now),
          lastDailyReset: getLocalDateKey(now),
        });
      },

      addTask: ({ title, detail, due }) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;

        const nowIso = new Date().toISOString();

        const newTask: TaskItem = {
          id: makeTaskId(),
          title: cleanTitle,
          detail: detail?.trim() || 'Custom task',
          due: due?.trim() || 'Today',
          done: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));
      },

      toggleTask: (id) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, done: !task.done, updatedAt: nowIso }
              : task
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },

      resetDailyTasks: (force = false) => {
        const today = getLocalDateKey(new Date());
        const { lastDailyReset } = get();

        if (!force && lastDailyReset === today) return;

        const nowIso = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((task) => ({
            ...task,
            done: false,
            updatedAt: nowIso,
          })),
          lastDailyReset: today,
        }));
      },
    }),
    {
      name: 'wenwen-task-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        lastDailyReset: state.lastDailyReset,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
