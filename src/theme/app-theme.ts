import { usePreferencesStore } from '@/src/store/preferences-store';

export const APP_THEME = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    softSurface: '#F8FBFC',
    activeSurface: '#EAF7F5',
    border: '#E8EDF5',
    softBorder: '#E2E9F2',
    text: '#1E2A3F',
    textStrong: '#25324A',
    muted: '#657287',
    subtle: '#8A98AD',
    primary: '#319A8D',
    primaryStrong: '#247D74',
    primarySoft: '#F0FAF8',
    shadow: '#50627A',
  },
  dark: {
    background: '#101923',
    surface: '#172331',
    softSurface: '#1D2B3A',
    activeSurface: '#183A39',
    border: '#2B3A4B',
    softBorder: '#334457',
    text: '#F2F6FA',
    textStrong: '#E7EEF7',
    muted: '#B4C0CF',
    subtle: '#8392A5',
    primary: '#5BCBBC',
    primaryStrong: '#7ADFD2',
    primarySoft: '#173A37',
    shadow: '#05080C',
  },
} as const;

export function useAppTheme() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  return APP_THEME[themeMode];
}
