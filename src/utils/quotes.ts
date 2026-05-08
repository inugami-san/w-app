const DAILY_QUOTES = [
  'Small steps are still progress. You are doing enough for today.',
  'Pause, breathe, then begin with one gentle action.',
  'Consistency grows quietly. Show up softly, one task at a time.',
  'You do not need to rush. Calm effort counts.',
  'A lighter day starts with one completed promise to yourself.',
  'Focus on one thing now. The rest can wait.',
  'You are allowed to move slowly and still move forward.',
] as const;

export function getDailyQuote(date = new Date()): string {
  const day = date.getDay();
  return DAILY_QUOTES[day] ?? DAILY_QUOTES[0];
}
