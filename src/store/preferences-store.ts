import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppThemeMode = 'light' | 'dark';
export type ReminderTimeKey = 'morning' | 'afternoon' | 'evening';

type PreferencesStore = {
  themeMode: AppThemeMode;
  displayName: string;
  hasCompletedOnboarding: boolean;
  hasHydrated: boolean;
  remindersEnabled: boolean;
  reminderTime: ReminderTimeKey;
  reminderNotificationId: string | null;
  setThemeMode: (themeMode: AppThemeMode) => void;
  setDisplayName: (displayName: string) => void;
  completeOnboarding: (displayName: string) => void;
  setHasHydrated: (value: boolean) => void;
  setReminderSettings: (settings: Partial<{
    remindersEnabled: boolean;
    reminderTime: ReminderTimeKey;
    reminderNotificationId: string | null;
  }>) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      themeMode: 'light',
      displayName: '',
      hasCompletedOnboarding: false,
      hasHydrated: false,
      remindersEnabled: false,
      reminderTime: 'morning',
      reminderNotificationId: null,
      setThemeMode: (themeMode) => set({ themeMode }),
      setDisplayName: (displayName) => set({ displayName }),
      completeOnboarding: (displayName) => set({
        displayName,
        hasCompletedOnboarding: true,
      }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setReminderSettings: (settings) => set(settings),
    }),
    {
      name: 'wenwen-preferences-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        displayName: state.displayName,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        remindersEnabled: state.remindersEnabled,
        reminderTime: state.reminderTime,
        reminderNotificationId: state.reminderNotificationId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
