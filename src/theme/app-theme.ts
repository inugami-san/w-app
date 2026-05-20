import { usePreferencesStore } from '@/src/store/preferences-store';

export const APP_THEME = {
  light: {
    background: '#F8F5EF',
    surface: '#FFFDF8',
    softSurface: '#F1ECE4',
    activeSurface: '#DFE9E1',
    border: '#E6DED2',
    softBorder: '#D7CDC0',
    text: '#18211D',
    textStrong: '#101713',
    muted: '#69736D',
    subtle: '#98A39B',
    primary: '#52796B',
    primaryStrong: '#315F52',
    primarySoft: '#E6EFE8',
    shadow: '#6E655B',
  },
  dark: {
    background: '#0F1512',
    surface: '#17201B',
    softSurface: '#1E2A24',
    activeSurface: '#244438',
    border: '#2B3A33',
    softBorder: '#374A41',
    text: '#F5F1EA',
    textStrong: '#FFF9F0',
    muted: '#B9C2B9',
    subtle: '#85938A',
    primary: '#4F826E',
    primaryStrong: '#A9D6C2',
    primarySoft: '#1F3A32',
    shadow: '#020706',
  },
} as const;

export function useAppTheme() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  return APP_THEME[themeMode];
}
