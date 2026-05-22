import { usePreferencesStore } from '@/src/store/preferences-store';

export const APP_THEME = {
  light: {
    background: '#F8F5EF',
    surface: '#FFFDF8',
    softSurface: '#F1ECE4',
    activeSurface: '#DFE9E1',
    border: '#E6DED2',
    softBorder: '#D7CDC0',
    text: '#172033',
    textStrong: '#101827',
    muted: '#687184',
    subtle: '#9AA3B2',
    primary: '#3F5F8A',
    primaryStrong: '#243B63',
    primarySoft: '#E7EDF7',
    shadow: '#596271',
  },
  dark: {
    background: '#0D1320',
    surface: '#141C2B',
    softSurface: '#1B2638',
    activeSurface: '#223657',
    border: '#28364A',
    softBorder: '#35465C',
    text: '#F6F3EC',
    textStrong: '#FFF9F0',
    muted: '#C4CBD6',
    subtle: '#8F9BAA',
    primary: '#5278B8',
    primaryStrong: '#BFD6FF',
    primarySoft: '#1D2F4D',
    shadow: '#030711',
  },
} as const;

export function useAppTheme() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  return APP_THEME[themeMode];
}
