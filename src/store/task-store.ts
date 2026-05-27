import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDefaultTasks } from '@/src/features/tasks/defaultTasks';
import { useJournalStore } from '@/src/store/journal-store';
import { useRewardStore } from '@/src/store/reward-store';
import type { TaskEnergy, TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';
import { INPUT_LIMITS, sanitizeSingleLine } from '@/src/utils/input-limits';

type CreateTaskInput = {
  title: string;
  detail?: string;
  due?: string;
  isRoutine?: boolean;
  energy?: TaskEnergy;
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
  updateTask: (id: string, input: Partial<Pick<TaskItem, 'title' | 'detail' | 'due' | 'isRoutine' | 'energy'>>) => void;
  deleteTask: (id: string) => void;
  startCompletionCooldown: (durationMs: number) => void;
  resetDailyTasks: (force?: boolean) => void;
  clearTasks: () => void;
  setHasHydrated: (value: boolean) => void;
};

function makeTaskId() {
  return `task-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizeEnergy(energy: TaskEnergy | undefined): TaskEnergy {
  return energy ?? 'medium';
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
      energy: normalizeEnergy(task.energy),
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

      addTask: ({ title, detail, due, isRoutine, energy }) => {
        const cleanTitle = sanitizeSingleLine(title, INPUT_LIMITS.taskTitle);
        if (!cleanTitle) return;

        const nowIso = new Date().toISOString();

        const newTask: TaskItem = {
          id: makeTaskId(),
          title: cleanTitle,
          detail: detail ? sanitizeSingleLine(detail, INPUT_LIMITS.taskDetail) || 'Custom task' : 'Custom task',
          due: due ? sanitizeSingleLine(due, 40) || 'Today' : 'Today',
          done: false,
          isRoutine: Boolean(isRoutine),
          energy: normalizeEnergy(energy),
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
          hasDecidedStarterTasks: true,
        }));
      },

      toggleTask: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (task && !task.done) {
          useRewardStore.getState().awardTaskCompletion(id, getLocalDateKey(new Date()));
        }

        const nowIso = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, done: !task.done, updatedAt: nowIso }
              : task
          ),
        }));
      },

      updateTask: (id, input) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;

            return {
              ...task,
              title: input.title === undefined ? task.title : sanitizeSingleLine(input.title, INPUT_LIMITS.taskTitle) || task.title,
              detail: input.detail === undefined ? task.detail : sanitizeSingleLine(input.detail, INPUT_LIMITS.taskDetail) || task.detail,
              due: input.due === undefined ? task.due : sanitizeSingleLine(input.due, 40) || task.due,
              isRoutine: input.isRoutine === undefined ? task.isRoutine : input.isRoutine,
              energy: input.energy === undefined ? normalizeEnergy(task.energy) : input.energy,
              updatedAt: nowIso,
            };
          }),
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

      clearTasks: () => {
        set({
          tasks: [],
          lastDailyReset: getLocalDateKey(new Date()),
          completionCooldownUntil: 0,
          hasDecidedStarterTasks: false,
        });
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
