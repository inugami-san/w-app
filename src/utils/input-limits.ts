export const INPUT_LIMITS = {
  displayName: 40,
  taskTitle: 80,
  taskDetail: 220,
  taskFocus: 140,
  journalNote: 4000,
  companionMessage: 1200,
} as const;

export function clampText(value: string, maxLength: number) {
  const clean = value.replace(/\0/g, '');
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

export function sanitizeSingleLine(value: string, maxLength: number) {
  return clampText(value, maxLength).replace(/\s+/g, ' ').trim();
}
