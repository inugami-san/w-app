import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDefaultTasks } from '@/src/features/tasks/defaultTasks';
import { useJournalStore } from '@/src/store/journal-store';
import type { TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';

type CreateTaskInput = {
  title: string;
  detail?: string;
  due?: string;
  isRoutine?: boolean;
};

type TaskStore = {
  tasks: TaskItem[];
  lastDailyReset: string;
  completionCooldownUntil: number;
  hasHydrated: boolean;
  hasDecidedStarterTasks: boolean;
  initializeTasks: () => void;
  acceptStarterTasks: () => void;
  declineStarterTasks: () => void;
  addTask: (input: CreateTaskInput) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  startCompletionCooldown: (durationMs: number) => void;
  resetDailyTasks: (force?: boolean) => void;
  setHasHydrated: (value: boolean) => void;
};

function makeTaskId() {
  return `task-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function archiveTasksForDate(dateKey: string, tasks: TaskItem[]) {
  if (!dateKey || tasks.length === 0) return;

  useJournalStore.getState().setTaskSnapshot(
    dateKey,
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.detail,
      done: task.done,
      isRoutine: Boolean(task.isRoutine),
    }))
  );
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      lastDailyReset: '',
      completionCooldownUntil: 0,
      hasHydrated: false,
      hasDecidedStarterTasks: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      initializeTasks: () => {
        const now = new Date();
        const today = getLocalDateKey(now);
        if (get().lastDailyReset) return;
        set({ lastDailyReset: today });
      },

      acceptStarterTasks: () => {
        if (get().tasks.length > 0) {
          set({ hasDecidedStarterTasks: true });
          return;
        }

        const now = new Date();
        set({
          tasks: createDefaultTasks(now),
          lastDailyReset: getLocalDateKey(now),
          hasDecidedStarterTasks: true,
        });
      },

      declineStarterTasks: () => {
        set({ hasDecidedStarterTasks: true });
      },

      addTask: ({ title, detail, due, isRoutine }) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;

        const nowIso = new Date().toISOString();

        const newTask: TaskItem = {
          id: makeTaskId(),
          title: cleanTitle,
          detail: detail?.trim() || 'Custom task',
          due: due?.trim() || 'Today',
          done: false,
          isRoutine: Boolean(isRoutine),
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
          hasDecidedStarterTasks: true,
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

      startCompletionCooldown: (durationMs) => {
        set({ completionCooldownUntil: Date.now() + durationMs });
      },

      resetDailyTasks: (force = false) => {
        const today = getLocalDateKey(new Date());
        const { lastDailyReset, tasks } = get();

        if (!force && lastDailyReset === today) return;

        if (force) {
          const nowIso = new Date().toISOString();
          set((state) => ({
            tasks: state.tasks.map((task) => ({
              ...task,
              done: false,
              updatedAt: nowIso,
            })),
            lastDailyReset: today,
          }));
          return;
        }

        if (lastDailyReset && lastDailyReset !== today) {
          archiveTasksForDate(lastDailyReset, tasks);
          const nowIso = new Date().toISOString();
          const routineTasks = tasks
            .filter((task) => task.isRoutine)
            .map((task) => ({
              ...task,
              done: false,
              due: 'Today',
              updatedAt: nowIso,
            }));

          set({
            tasks: routineTasks,
            lastDailyReset: today,
            completionCooldownUntil: 0,
          });
          return;
        }

        set({ lastDailyReset: today });
      },
    }),
    {
      name: 'wenwen-task-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        lastDailyReset: state.lastDailyReset,
        completionCooldownUntil: state.completionCooldownUntil,
        hasDecidedStarterTasks: state.hasDecidedStarterTasks,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
