import { usePreferencesStore } from '@/src/store/preferences-store';

export const APP_THEME = {
  light: {
    background: '#F6F8F7',
    surface: '#FFFFFF',
    softSurface: '#EFF4F2',
    activeSurface: '#DDF1EC',
    border: '#E1E8E5',
    softBorder: '#D4DEDA',
    text: '#15201F',
    textStrong: '#111817',
    muted: '#65716E',
    subtle: '#96A19D',
    primary: '#168C7E',
    primaryStrong: '#0F6F64',
    primarySoft: '#E4F5F1',
    shadow: '#193B36',
  },
  dark: {
    background: '#0F1514',
    surface: '#17211F',
    softSurface: '#1F2B29',
    activeSurface: '#163C37',
    border: '#283634',
    softBorder: '#344541',
    text: '#F2F7F5',
    textStrong: '#E8F0EE',
    muted: '#AEBBB7',
    subtle: '#82908C',
    primary: '#62D0C1',
    primaryStrong: '#8FE7DD',
    primarySoft: '#173A36',
    shadow: '#020706',
  },
} as const;

export function useAppTheme() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  return APP_THEME[themeMode];
}
