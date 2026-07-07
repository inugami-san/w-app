import { usePreferencesStore } from '@/src/store/preferences-store';

export const APP_THEME = {
  light: {
    background: '#FAF7F0',
    surface: '#FFFDF8',
    softSurface: '#F2EFE3',
    activeSurface: '#DDECCE',
    border: '#E9E0D2',
    softBorder: '#D7DCC5',
    text: '#34413C',
    textStrong: '#24322E',
    muted: '#6F7C73',
    subtle: '#A3ADA2',
    primary: '#73B987',
    primaryStrong: '#3F8C5B',
    primarySoft: '#E4F1DC',
    shadow: '#736B5F',
  },
  dark: {
    background: '#111813',
    surface: '#18231C',
    softSurface: '#222D24',
    activeSurface: '#2B4932',
    border: '#314036',
    softBorder: '#465B49',
    text: '#FAF7F0',
    textStrong: '#FFFDF8',
    muted: '#CBD2C6',
    subtle: '#99A695',
    primary: '#8ED29B',
    primaryStrong: '#C7F0CC',
    primarySoft: '#213829',
    shadow: '#050704',
  },
} as const;

export function useAppTheme() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  return APP_THEME[themeMode];
}
