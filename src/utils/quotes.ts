const DAILY_QUOTES = [
  'Pick one priority and finish it.',
  'Pause, breathe, then get started.',
  'Consistency is built one task at a time.',
  'Keep the plan realistic and follow through.',
  'A completed task makes the day easier to manage.',
  'Focus on one thing now. Handle the rest after.',
  'Progress counts even when the pace is slow.',
] as const;

export function getDailyQuote(date = new Date()): string {
  const day = date.getDay();
  return DAILY_QUOTES[day] ?? DAILY_QUOTES[0];
}
