import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { INPUT_LIMITS, sanitizeSingleLine } from '@/src/utils/input-limits';

export type AppThemeMode = 'light' | 'dark';
export type ReminderTimeKey = 'morning' | 'afternoon' | 'evening';
export type AvatarPersona = 'bot' | 'cat';

export type AvatarColors = {
  eyeColor: string;
  faceColor: string;
  bodyColor: string;
};

export type HomeGuideFeature = 'journal' | 'companion';

export type HomeGuideState = {
  dismissed: boolean;
  visitedJournal: boolean;
  visitedCompanion: boolean;
};

export const DEFAULT_AVATAR_COLORS: AvatarColors = {
  eyeColor: '#58CFC6',
  faceColor: '#E9EFEA',
  bodyColor: '#F7F3EC',
};
export const DEFAULT_AVATAR_PERSONA: AvatarPersona = 'bot';

export const DEFAULT_HOME_GUIDE: HomeGuideState = {
  dismissed: false,
  visitedJournal: false,
  visitedCompanion: false,
};

const LEGACY_DEFAULT_AVATAR_COLORS: AvatarColors = {
  eyeColor: '#00D4C2',
  faceColor: '#E2E8F0',
  bodyColor: '#F0F2F5',
};

function isLegacyDefaultAvatar(colors: AvatarColors) {
  return (
    colors.eyeColor === LEGACY_DEFAULT_AVATAR_COLORS.eyeColor &&
    colors.faceColor === LEGACY_DEFAULT_AVATAR_COLORS.faceColor &&
    colors.bodyColor === LEGACY_DEFAULT_AVATAR_COLORS.bodyColor
  );
}

type PreferencesStore = {
  themeMode: AppThemeMode;
  displayName: string;
  hasCompletedOnboarding: boolean;
  hasHydrated: boolean;
  avatarPersona: AvatarPersona;
  avatarColors: AvatarColors;
  homeGuide: HomeGuideState;
  remindersEnabled: boolean;
  reminderTime: ReminderTimeKey;
  reminderNotificationId: string | null;
  nightlyReviewEnabled: boolean;
  nightlyReviewNotificationId: string | null;
  companionMemoryEnabled: boolean;
  reducedMotion: boolean;
  setThemeMode: (themeMode: AppThemeMode) => void;
  setDisplayName: (displayName: string) => void;
  completeOnboarding: (displayName: string) => void;
  setHasHydrated: (value: boolean) => void;
  setAvatarPersona: (persona: AvatarPersona) => void;
  setAvatarColors: (colors: Partial<AvatarColors>) => void;
  dismissHomeGuide: () => void;
  resetHomeGuide: () => void;
  markHomeGuideFeatureVisited: (feature: HomeGuideFeature) => void;
  setCompanionMemoryEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  resetPreferences: () => void;
  setReminderSettings: (settings: Partial<{
    remindersEnabled: boolean;
    reminderTime: ReminderTimeKey;
    reminderNotificationId: string | null;
    nightlyReviewEnabled: boolean;
    nightlyReviewNotificationId: string | null;
  }>) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      themeMode: 'light',
      displayName: '',
      hasCompletedOnboarding: false,
      hasHydrated: false,
      avatarPersona: DEFAULT_AVATAR_PERSONA,
      avatarColors: DEFAULT_AVATAR_COLORS,
      homeGuide: DEFAULT_HOME_GUIDE,
      remindersEnabled: false,
      reminderTime: 'morning',
      reminderNotificationId: null,
      nightlyReviewEnabled: false,
      nightlyReviewNotificationId: null,
      companionMemoryEnabled: true,
      reducedMotion: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      setDisplayName: (displayName) => set({ displayName: sanitizeSingleLine(displayName, INPUT_LIMITS.displayName) }),
      completeOnboarding: (displayName) => set({
        displayName: sanitizeSingleLine(displayName, INPUT_LIMITS.displayName) || 'Friend',
        hasCompletedOnboarding: true,
      }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setAvatarPersona: (avatarPersona) => set({ avatarPersona }),
      setAvatarColors: (avatarColors) => set((state) => ({
        avatarColors: {
          eyeColor: avatarColors.eyeColor ?? state.avatarColors.eyeColor ?? DEFAULT_AVATAR_COLORS.eyeColor,
          faceColor: avatarColors.faceColor ?? state.avatarColors.faceColor ?? DEFAULT_AVATAR_COLORS.faceColor,
          bodyColor: avatarColors.bodyColor ?? state.avatarColors.bodyColor ?? DEFAULT_AVATAR_COLORS.bodyColor,
        },
      })),
      dismissHomeGuide: () => set((state) => ({
        homeGuide: {
          ...state.homeGuide,
          dismissed: true,
        },
      })),
      resetHomeGuide: () => set({ homeGuide: DEFAULT_HOME_GUIDE }),
      markHomeGuideFeatureVisited: (feature) => set((state) => ({
        homeGuide: {
          ...state.homeGuide,
          visitedJournal: feature === 'journal' ? true : state.homeGuide.visitedJournal,
          visitedCompanion: feature === 'companion' ? true : state.homeGuide.visitedCompanion,
        },
      })),
      setCompanionMemoryEnabled: (companionMemoryEnabled) => set({ companionMemoryEnabled }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      resetPreferences: () => set({
        themeMode: 'light',
        displayName: '',
        hasCompletedOnboarding: false,
        avatarPersona: DEFAULT_AVATAR_PERSONA,
        avatarColors: DEFAULT_AVATAR_COLORS,
        homeGuide: DEFAULT_HOME_GUIDE,
        remindersEnabled: false,
        reminderTime: 'morning',
        reminderNotificationId: null,
        nightlyReviewEnabled: false,
        nightlyReviewNotificationId: null,
        companionMemoryEnabled: true,
        reducedMotion: false,
      }),
      setReminderSettings: (settings) => set(settings),
    }),
    {
      name: 'wenwen-preferences-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        displayName: state.displayName,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        avatarPersona: state.avatarPersona,
        avatarColors: state.avatarColors,
        homeGuide: state.homeGuide,
        remindersEnabled: state.remindersEnabled,
        reminderTime: state.reminderTime,
        reminderNotificationId: state.reminderNotificationId,
        nightlyReviewEnabled: state.nightlyReviewEnabled,
        nightlyReviewNotificationId: state.nightlyReviewNotificationId,
        companionMemoryEnabled: state.companionMemoryEnabled,
        reducedMotion: state.reducedMotion,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && isLegacyDefaultAvatar(state.avatarColors)) {
          state.setAvatarColors(DEFAULT_AVATAR_COLORS);
        } else {
          state?.setAvatarColors({});
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
