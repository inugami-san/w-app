import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AvatarPersona } from '@/src/store/preferences-store';

export const REWARD_CURRENCY_NAME = 'Energy';
export const TASK_COMPLETION_REWARD = 1;
export const JOURNAL_ENTRY_REWARD = 1;
export const COMPANION_CHAT_DAILY_REWARD = 1;
export const STEP_ENERGY_THRESHOLD = 1000;
export const STEP_ENERGY_REWARD = 1;
export const PAID_COLOR_COST = 1;
export const PERSONA_CHARGE_COST = 1;
export const PERSONA_CHARGE_HOURS = 2;
export const PERSONA_CHARGE_MS = PERSONA_CHARGE_HOURS * 60 * 60 * 1000;
export const TASK_SUGGESTION_COST = 1;
export const DEEP_REVIEW_COST = 1;
export const VOICE_TRANSCRIPTION_COST = 1;
export const WELLNESS_REVIEW_COST = 1;
export const PERSONA_UNLOCK_COSTS: Partial<Record<AvatarPersona, number>> = {
  cat: 12,
};

type RewardStore = {
  glowBalance: number;
  personaChargeExpiresAt: string;
  unlockedColorIds: string[];
  unlockedPersonas: AvatarPersona[];
  rewardedTaskIds: string[];
  rewardedJournalDateKeys: string[];
  rewardedCompanionDateKeys: string[];
  rewardedStepMilestones: Record<string, number>;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  awardTaskCompletion: (taskId: string, dateKey: string) => void;
  awardJournalEntry: (dateKey: string) => void;
  awardCompanionChat: (dateKey: string) => void;
  awardStepEnergy: (dateKey: string, steps: number) => number;
  spendEnergy: (amount: number) => boolean;
  chargePersona: (cost?: number) => boolean;
  hasActivePersonaCharge: (now?: number) => boolean;
  getPersonaChargeRemainingMs: (now?: number) => number;
  unlockColor: (colorId: string, cost?: number) => boolean;
  unlockPersona: (persona: AvatarPersona, cost?: number) => boolean;
  isColorUnlocked: (colorId: string) => boolean;
  isPersonaUnlocked: (persona: AvatarPersona) => boolean;
  clearRewards: () => void;
};

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function createTaskCompletionRewardKey(taskId: string, dateKey: string) {
  return `${dateKey}:${taskId}`;
}

export const useRewardStore = create<RewardStore>()(
  persist(
    (set, get) => ({
      glowBalance: 0,
      personaChargeExpiresAt: '',
      unlockedColorIds: [],
      unlockedPersonas: ['bot'],
      rewardedTaskIds: [],
      rewardedJournalDateKeys: [],
      rewardedCompanionDateKeys: [],
      rewardedStepMilestones: {},
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      awardTaskCompletion: (taskId, dateKey) => {
        if (!taskId || !dateKey) return;

        const rewardKey = createTaskCompletionRewardKey(taskId, dateKey);
        if (get().rewardedTaskIds.includes(rewardKey)) return;

        set((state) => ({
          glowBalance: state.glowBalance + TASK_COMPLETION_REWARD,
          rewardedTaskIds: [...state.rewardedTaskIds, rewardKey],
        }));
      },

      awardJournalEntry: (dateKey) => {
        if (!dateKey || get().rewardedJournalDateKeys.includes(dateKey)) return;

        set((state) => ({
          glowBalance: state.glowBalance + JOURNAL_ENTRY_REWARD,
          rewardedJournalDateKeys: [...state.rewardedJournalDateKeys, dateKey],
        }));
      },

      awardCompanionChat: (dateKey) => {
        if (!dateKey || get().rewardedCompanionDateKeys.includes(dateKey)) return;

        set((state) => ({
          glowBalance: state.glowBalance + COMPANION_CHAT_DAILY_REWARD,
          rewardedCompanionDateKeys: [...state.rewardedCompanionDateKeys, dateKey],
        }));
      },

      awardStepEnergy: (dateKey, steps) => {
        if (!dateKey || !Number.isFinite(steps) || steps < STEP_ENERGY_THRESHOLD) return 0;

        const completedMilestones = Math.floor(steps / STEP_ENERGY_THRESHOLD);
        const awardedMilestones = get().rewardedStepMilestones[dateKey] ?? 0;
        const newMilestones = Math.max(0, completedMilestones - awardedMilestones);
        if (newMilestones <= 0) return 0;

        set((state) => ({
          glowBalance: state.glowBalance + newMilestones * STEP_ENERGY_REWARD,
          rewardedStepMilestones: {
            ...state.rewardedStepMilestones,
            [dateKey]: completedMilestones,
          },
        }));

        return newMilestones * STEP_ENERGY_REWARD;
      },

      spendEnergy: (amount) => {
        const cost = Math.max(0, Math.floor(amount));
        if (cost <= 0) return true;

        const state = get();
        if (state.glowBalance < cost) return false;

        set({ glowBalance: state.glowBalance - cost });
        return true;
      },

      chargePersona: (cost = PERSONA_CHARGE_COST) => {
        const state = get();
        if (state.glowBalance < cost) return false;

        const now = Date.now();
        const currentExpiry = Date.parse(state.personaChargeExpiresAt);
        const chargeBase = Number.isFinite(currentExpiry) && currentExpiry > now ? currentExpiry : now;

        set({
          glowBalance: state.glowBalance - cost,
          personaChargeExpiresAt: new Date(chargeBase + PERSONA_CHARGE_MS).toISOString(),
        });
        return true;
      },

      hasActivePersonaCharge: (now = Date.now()) => {
        const expiresAt = Date.parse(get().personaChargeExpiresAt);
        return Number.isFinite(expiresAt) && expiresAt > now;
      },

      getPersonaChargeRemainingMs: (now = Date.now()) => {
        const expiresAt = Date.parse(get().personaChargeExpiresAt);
        if (!Number.isFinite(expiresAt)) return 0;
        return Math.max(0, expiresAt - now);
      },

      unlockColor: (colorId, cost = PAID_COLOR_COST) => {
        const state = get();
        if (!colorId) return false;
        if (state.unlockedColorIds.includes(colorId)) return true;
        if (state.glowBalance < cost) return false;

        set({
          glowBalance: state.glowBalance - cost,
          unlockedColorIds: [...state.unlockedColorIds, colorId],
        });
        return true;
      },

      unlockPersona: (persona, cost = PERSONA_UNLOCK_COSTS[persona] ?? 0) => {
        const state = get();
        if (state.unlockedPersonas.includes(persona)) return true;
        if (state.glowBalance < cost) return false;

        set({
          glowBalance: state.glowBalance - cost,
          unlockedPersonas: [...state.unlockedPersonas, persona],
        });
        return true;
      },

      isColorUnlocked: (colorId) => get().unlockedColorIds.includes(colorId),

      isPersonaUnlocked: (persona) => get().unlockedPersonas.includes(persona),

      clearRewards: () => {
        set({
          glowBalance: 0,
          personaChargeExpiresAt: '',
          unlockedColorIds: [],
          unlockedPersonas: ['bot'],
          rewardedTaskIds: [],
          rewardedJournalDateKeys: [],
          rewardedCompanionDateKeys: [],
          rewardedStepMilestones: {},
        });
      },
    }),
    {
      name: 'wenwen-reward-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        glowBalance: state.glowBalance,
        personaChargeExpiresAt: state.personaChargeExpiresAt,
        unlockedColorIds: state.unlockedColorIds,
        unlockedPersonas: state.unlockedPersonas,
        rewardedTaskIds: state.rewardedTaskIds,
        rewardedJournalDateKeys: state.rewardedJournalDateKeys,
        rewardedCompanionDateKeys: state.rewardedCompanionDateKeys,
        rewardedStepMilestones: state.rewardedStepMilestones,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unlockedPersonas = uniqueValues([...(state.unlockedPersonas ?? []), 'bot']);
          state.unlockedColorIds = uniqueValues(state.unlockedColorIds ?? []);
          state.rewardedTaskIds = uniqueValues(state.rewardedTaskIds ?? []);
          state.rewardedJournalDateKeys = uniqueValues(state.rewardedJournalDateKeys ?? []);
          state.rewardedCompanionDateKeys = uniqueValues(state.rewardedCompanionDateKeys ?? []);
          state.rewardedStepMilestones = state.rewardedStepMilestones ?? {};
          state.personaChargeExpiresAt = state.personaChargeExpiresAt ?? '';
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
