import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppThemeMode = 'light' | 'dark';

type PreferencesStore = {
  themeMode: AppThemeMode;
  setThemeMode: (themeMode: AppThemeMode) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      themeMode: 'light',
      setThemeMode: (themeMode) => set({ themeMode }),
    }),
    {
      name: 'wenwen-preferences-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
