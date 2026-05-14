import type { MoodOption } from '@/src/types/journal';

export const MOOD_OPTIONS: MoodOption[] = [
  { key: 'calm', label: 'Calm' },
  { key: 'okay', label: 'Okay' },
  { key: 'tired', label: 'Tired' },
  { key: 'anxious', label: 'Anxious' },
  { key: 'heavy', label: 'Heavy' },
  { key: 'hopeful', label: 'Hopeful' },
];

export function getMoodLabel(key?: string) {
  return MOOD_OPTIONS.find((option) => option.key === key)?.label;
}
