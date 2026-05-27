import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { WellnessReviewSummary } from '@/src/types/wellness-review';

type CreateWellnessReviewInput = Omit<WellnessReviewSummary, 'id' | 'createdAt'>;

type WellnessReviewStore = {
  reviews: Record<string, WellnessReviewSummary>;
  lastShownPeriodKey: string;
  requestedPeriodKey: string;
  hasHydrated: boolean;
  addReview: (input: CreateWellnessReviewInput) => WellnessReviewSummary;
  setLastShownPeriodKey: (periodKey: string) => void;
  requestReview: (periodKey: string) => void;
  clearRequestedReview: () => void;
  clearWellnessReviews: () => void;
  setHasHydrated: (value: boolean) => void;
};

function createReviewId() {
  return `wellness-review-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const useWellnessReviewStore = create<WellnessReviewStore>()(
  persist(
    (set) => ({
      reviews: {},
      lastShownPeriodKey: '',
      requestedPeriodKey: '',
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      addReview: (input) => {
        const review: WellnessReviewSummary = {
          ...input,
          id: createReviewId(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          reviews: {
            ...state.reviews,
            [input.periodKey]: review,
          },
        }));

        return review;
      },

      setLastShownPeriodKey: (periodKey) => {
        set({ lastShownPeriodKey: periodKey });
      },

      requestReview: (periodKey) => {
        set({ requestedPeriodKey: periodKey });
      },

      clearRequestedReview: () => {
        set({ requestedPeriodKey: '' });
      },

      clearWellnessReviews: () => {
        set({
          reviews: {},
          lastShownPeriodKey: '',
          requestedPeriodKey: '',
        });
      },
    }),
    {
      name: 'wenwen-wellness-review-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        reviews: state.reviews,
        lastShownPeriodKey: state.lastShownPeriodKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
